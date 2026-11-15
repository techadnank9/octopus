import SwiftUI

struct ItemEditorView: View {
    let draft: ItemDraft
    let onSave: (String, Double) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var price: String

    init(draft: ItemDraft, onSave: @escaping (String, Double) -> Void) {
        self.draft = draft
        self.onSave = onSave
        _name = State(initialValue: draft.name)
        _price = State(initialValue: draft.price)
    }

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var priceCents: Double? { Money.cents(from: price) }

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                TextField("Price", text: $price)
                    .keyboardType(.decimalPad)
            }
            .font(Theme.body)
            .navigationTitle(draft.itemId == nil ? "Add item" : "Edit item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if let priceCents { onSave(trimmedName, priceCents) }
                        dismiss()
                    }
                    .disabled(trimmedName.isEmpty || priceCents == nil)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
