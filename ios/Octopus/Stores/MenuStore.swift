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
                self?.errorMessage = error.localizedDescription
            }
        }
    }

    deinit {
        task?.cancel()
    }

    func readMenu(from image: UIImage) async {
        guard let jpeg = image.jpegForUpload() else { return }
        isReading = true
        defer { isReading = false }
        do {
            let saved = try await ConvexService.shared.extractMenu(shopId: shopId, jpeg: jpeg)
            if saved == 0 { errorMessage = "We could not find any items in that photo. Try another one." }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func save(id: String?, name: String, priceCents: Double) async {
        do {
            try await ConvexService.shared.saveItem(shopId: shopId, id: id, name: name, priceCents: priceCents)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func remove(_ item: Item) async {
        do {
            try await ConvexService.shared.removeItem(id: item.id)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
