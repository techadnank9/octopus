import AudioToolbox
import SwiftUI

@MainActor
final class OrdersStore: ObservableObject {
    @Published private(set) var orders: [Order] = []
    @Published private(set) var hasLoaded = false
    @Published var errorMessage: String?

    private let shopId: String
    private var knownIds: Set<String> = []
    private var task: Task<Void, Never>?

    init(shopId: String) {
        self.shopId = shopId
        let lists = ConvexService.shared.orders(shopId: shopId).values
        task = Task { [weak self] in
            do {
                for try await orders in lists {
                    self?.receive(orders)
                }
            } catch {
                self?.errorMessage = error.localizedDescription
            }
        }
    }

    deinit {
        task?.cancel()
    }

    private func receive(_ latest: [Order]) {
        let ids = Set(latest.map(\.id))
        let hasNewOrder = hasLoaded && !ids.isSubset(of: knownIds)
        knownIds.formUnion(ids)
        hasLoaded = true
        if hasNewOrder { announceNewOrder() }
        withAnimation(.spring(response: 0.45, dampingFraction: 0.72)) {
            orders = latest
        }
    }

    private func announceNewOrder() {
        AudioServicesPlaySystemSound(1007)
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func setStatus(_ order: Order, to status: OrderStatus) async {
        await run { try await ConvexService.shared.setStatus(orderId: order.id, status: status) }
    }

    func markPaidDemo(_ order: Order) async {
        await run { try await ConvexService.shared.markPaidDemo(orderId: order.id) }
    }

    func addTestOrder() async {
        let shopId = shopId
        await run { try await ConvexService.shared.createDemoOrder(shopId: shopId) }
    }

    private func run(_ work: () async throws -> Void) async {
        do {
            try await work()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
