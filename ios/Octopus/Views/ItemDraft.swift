import Foundation

/// What the item editor is editing: an existing item, or a new one when itemId is nil.
struct ItemDraft: Identifiable {
    let id = UUID()
    let itemId: String?
    let name: String
    let price: String
    /// Empty when the item has no category.
    let category: String

    init() {
        itemId = nil
        name = ""
        price = ""
        category = ""
    }

    init(item: Item) {
        itemId = item.id
        name = item.name
        price = Money.input(cents: item.priceCents)
        category = item.category ?? ""
    }
}
