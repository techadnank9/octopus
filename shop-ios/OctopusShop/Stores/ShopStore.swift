import SwiftUI

/// The open shop: its live menu, this customer's cart, favourites and current order.
@MainActor
final class ShopStore: ObservableObject {
    @Published private(set) var shop: ShopInfo?
    @Published private(set) var items: [MenuItem] = []
    @Published private(set) var order: CustomerOrder?
    @Published private(set) var cart: [String: Int] = [:]
    @Published private(set) var favourites: Set<String>
    @Published private(set) var errorMessage: String?

    let shopId: String
    private var orderId: String?
    private var task: Task<Void, Never>?

    private var orderKey: String { "order.\(shopId)" }
    private var favouritesKey: String { "favourites.\(shopId)" }

    init(shopId: String) {
        self.shopId = shopId
        orderId = UserDefaults.standard.string(forKey: "order.\(shopId)")
        favourites = Set(UserDefaults.standard.stringArray(forKey: "favourites.\(shopId)") ?? [])
        subscribe()
    }

    deinit {
        task?.cancel()
    }

    /// Restarted whenever the order id changes, so `order` follows the right one.
    private func subscribe() {
        task?.cancel()
        let updates = ConvexService.shared.storefront(shopId: shopId, orderId: orderId).values
        task = Task { [weak self] in
            do {
                for try await storefront in updates {
                    self?.receive(storefront)
                }
            } catch {
                self?.errorMessage = error.plainMessage
            }
        }
    }

    private func receive(_ storefront: Storefront) {
        Money.currencyCode = storefront.shop.currency.uppercased()
        errorMessage = nil
        shop = storefront.shop
        items = storefront.items
        withAnimation { order = storefront.order }
    }

    // MARK: Cart

    /// Cart lines in menu order.
    var cartLines: [(item: MenuItem, qty: Int)] {
        items.compactMap { item in
            cart[item.name].map { (item, $0) }
        }
    }

    var cartCount: Int { cartLines.reduce(0) { $0 + $1.qty } }
    var cartTotalCents: Double { cartLines.reduce(0) { $0 + $1.item.priceCents * Double($1.qty) } }

    func quantity(of item: MenuItem) -> Int { cart[item.name] ?? 0 }

    func canAdd(_ item: MenuItem) -> Bool {
        guard !item.isSoldOut else { return false }
        guard let stock = item.stock else { return true }
        return Double(quantity(of: item)) < stock
    }

    func add(_ item: MenuItem) {
        if canAdd(item) { cart[item.name, default: 0] += 1 }
    }

    func remove(_ item: MenuItem) {
        let left = quantity(of: item) - 1
        cart[item.name] = left > 0 ? left : nil
    }

    // MARK: Favourites

    func toggleFavourite(_ item: MenuItem) {
        if !favourites.insert(item.name).inserted { favourites.remove(item.name) }
        UserDefaults.standard.set(favourites.sorted(), forKey: favouritesKey)
    }

    // MARK: Order

    func placeOrder(name: String, requestedTime: String?) async throws {
        let lines = cartLines.map { (name: $0.item.name, qty: $0.qty) }
        let id = try await ConvexService.shared.placeOrder(
            shopId: shopId, name: name, requestedTime: requestedTime, lines: lines)
        UserDefaults.standard.set(id, forKey: orderKey)
        orderId = id
        cart = [:]
        subscribe()
    }

    func startNewOrder() {
        UserDefaults.standard.removeObject(forKey: orderKey)
        orderId = nil
        order = nil
        subscribe()
    }
}
