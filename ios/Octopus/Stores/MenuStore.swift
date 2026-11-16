import UIKit

/// One section of the menu. A nil category holds the uncategorised items.
struct ItemGroup: Identifiable {
    let category: String?
    var items: [Item]

    var id: String { category ?? "" }
    var title: String { "\(category ?? "Uncategorised"), \(items.count)" }
}

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

    /// Items grouped by category in the order first seen, with uncategorised items last.
    var groups: [ItemGroup] {
        var named: [ItemGroup] = []
        var loose: [Item] = []
        for item in items {
            guard let category = item.category, !category.isEmpty else {
                loose.append(item)
                continue
            }
            if let index = named.firstIndex(where: { $0.category == category }) {
                named[index].items.append(item)
            } else {
                named.append(ItemGroup(category: category, items: [item]))
            }
        }
        if !loose.isEmpty { named.append(ItemGroup(category: nil, items: loose)) }
        return named
    }

    /// The shop's existing categories, in the order first seen.
    var categories: [String] {
        groups.compactMap(\.category)
    }

    /// Pass a category only when it changed. An empty string clears it.
    func save(id: String?, name: String, priceCents: Double, category: String?) async {
        let shopId = shopId
        await run {
            let savedId = try await ConvexService.shared.saveItem(
                shopId: shopId, id: id, name: name, priceCents: priceCents)
            if let category {
                try await ConvexService.shared.setCategory(id: id ?? savedId, category: category)
            }
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
