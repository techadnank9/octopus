import SwiftUI

struct ItemEditorView: View {
    let draft: ItemDraft
    let suggestions: [String]
    /// Name, price in cents, and category (empty for none).
    let onSave: (String, Double, String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var price: String
    @State private var category: String

    init(draft: ItemDraft, suggestions: [String], onSave: @escaping (String, Double, String) -> Void) {
        self.draft = draft
        self.suggestions = suggestions
        self.onSave = onSave
        _name = State(initialValue: draft.name)
        _price = State(initialValue: draft.price)
        _category = State(initialValue: draft.category)
    }

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var trimmedCategory: String { category.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var priceCents: Double? { Money.cents(from: price) }

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                TextField("Price", text: $price)
                    .keyboardType(.decimalPad)
                TextField("Category", text: $category)
                if !suggestions.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(suggestions, id: \.self) { suggestion in
                                Button(suggestion) { category = suggestion }
                                    .font(Theme.caption)
                                    .foregroundStyle(suggestion == trimmedCategory ? Theme.card : Theme.purple)
                                    .padding(.horizontal, 12)
                                    .frame(minHeight: 36)
                                    .background(
                                        suggestion == trimmedCategory ? Theme.purple : Theme.purple.opacity(0.12),
                                        in: Capsule())
                            }
                        }
                    }
                    .buttonStyle(.borderless)
                }
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
                        if let priceCents { onSave(trimmedName, priceCents, trimmedCategory) }
                        dismiss()
                    }
                    .disabled(trimmedName.isEmpty || priceCents == nil)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
