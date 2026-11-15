import UIKit

@MainActor
final class MenuStore: ObservableObject {
    @Published private(set) var items: [Item] = []
    @Published private(set) var isReading = false
    @Published var errorMessage: String?

    private let shopId: String
    private var task: Task<Void, Never>?

    init(shopId: String) {
        self.shopId = shopId
        let lists = ConvexService.shared.items(shopId: shopId).values
        task = Task { [weak self] in
            do {
                for try await items in lists {
                    self?.items = items
                }
            } catch {
                self?.errorMessage = error.plainMessage
            }
        }
    }

    deinit {
        task?.cancel()
    }

    func readMenu(from image: UIImage) async {
        guard let jpeg = image.jpegForUpload() else {
            errorMessage = "We could not use that photo. Try another one."
            return
        }
        isReading = true
        defer { isReading = false }
        do {
            let saved = try await ConvexService.shared.extractMenu(shopId: shopId, jpeg: jpeg)
            if saved == 0 { errorMessage = "We could not find any items in that photo. Try another one." }
        } catch {
            errorMessage = error.plainMessage
        }
    }

    func save(id: String?, name: String, priceCents: Double) async {
        let shopId = shopId
        await run {
            try await ConvexService.shared.saveItem(shopId: shopId, id: id, name: name, priceCents: priceCents)
        }
    }

    func remove(_ item: Item) async {
        await run { try await ConvexService.shared.removeItem(id: item.id) }
    }

    /// Pass nil to stop counting the item.
    func setStock(_ item: Item, to stock: Double?) async {
        await run { try await ConvexService.shared.setStock(id: item.id, stock: stock) }
    }

    func setAvailable(_ item: Item, to available: Bool) async {
        await run { try await ConvexService.shared.setAvailable(id: item.id, available: available) }
    }

    private func run(_ work: () async throws -> Void) async {
        do {
            try await work()
        } catch {
            errorMessage = error.plainMessage
        }
    }
}
