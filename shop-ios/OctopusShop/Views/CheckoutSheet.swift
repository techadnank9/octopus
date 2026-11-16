import SwiftUI

struct CheckoutSheet: View {
    @ObservedObject var store: ShopStore
    @AppStorage(Device.nameKey) private var name = ""
    @State private var pickupTime = ""
    @State private var isPlacing = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Your order")
                    .font(Theme.title)
                VStack(spacing: 8) {
                    ForEach(store.cartLines, id: \.item.id) { line in
                        HStack {
                            Text("\(line.qty) × \(line.item.name)")
                            Spacer()
                            Text(Money.string(cents: line.item.priceCents * Double(line.qty)))
                        }
                        .font(Theme.body)
                    }
                    Divider()
                    HStack {
                        Text("Total")
                        Spacer()
                        Text(Money.string(cents: store.cartTotalCents))
                    }
                    .font(Theme.headline)
                }
                .card()
                FormField(title: "Your name", text: $name)
                    .textContentType(.givenName)
                FormField(title: "Pickup time (optional)", text: $pickupTime)
                if let errorMessage {
                    Text(errorMessage)
                        .font(Theme.caption)
                        .foregroundStyle(Theme.coral)
                }
                Button(isPlacing ? "Placing order…" : "Place order", action: place)
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(isPlacing || trimmedName.isEmpty || store.cartCount == 0)
                    .opacity(trimmedName.isEmpty ? 0.5 : 1)
            }
            .foregroundStyle(Theme.ink)
            .padding(20)
        }
        .screenBackground()
        .presentationDragIndicator(.visible)
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func place() {
        let time = pickupTime.trimmingCharacters(in: .whitespacesAndNewlines)
        isPlacing = true
        errorMessage = nil
        Task {
            do {
                try await store.placeOrder(name: trimmedName, requestedTime: time.isEmpty ? nil : time)
                dismiss()
            } catch {
                errorMessage = error.plainMessage
            }
            isPlacing = false
        }
    }
}
