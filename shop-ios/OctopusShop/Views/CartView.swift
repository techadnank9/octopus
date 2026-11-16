import SwiftUI

struct CartView: View {
    @ObservedObject var store: ShopStore
    @Binding var tab: AppTab
    @AppStorage(Device.nameKey) private var name = ""
    @State private var pickupTime = ""
    @State private var isPlacing = false
    @State private var errorMessage: String?

    var body: some View {
        if store.cartCount == 0 {
            EmptyState(symbol: "cart", title: "Your cart is empty", actionTitle: "Browse the shop") {
                tab = .shop
            }
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Cart")
                        .font(Theme.largeTitle)
                    VStack(spacing: 14) {
                        ForEach(store.cartLines, id: \.item.id) { line in
                            row(line.item, qty: line.qty)
                        }
                    }
                    .card()
                    summary
                    FormField(title: "Your name", text: $name)
                        .textContentType(.givenName)
                    FormField(title: "Pickup time (optional)", text: $pickupTime)
                    if let errorMessage {
                        Text(errorMessage)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.coral)
                    }
                    Button(action: place) {
                        HStack {
                            Text(isPlacing ? "Placing order…" : "Place order")
                            Spacer()
                            Text(Money.string(cents: store.cartTotalCents))
                        }
                        .padding(.horizontal, 18)
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(isPlacing || trimmedName.isEmpty)
                    .opacity(trimmedName.isEmpty ? 0.5 : 1)
                }
                .foregroundStyle(Theme.ink)
                .padding(16)
            }
            .scrollDismissesKeyboard(.interactively)
            .screenBackground()
        }
    }

    private func row(_ item: MenuItem, qty: Int) -> some View {
        HStack(spacing: 12) {
            ProductPhoto(item: item)
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(Theme.body)
                    .lineLimit(2)
                Text(Money.string(cents: item.priceCents))
                    .font(Theme.caption)
                    .foregroundStyle(Theme.ink.opacity(0.6))
            }
            Spacer(minLength: 0)
            VStack(alignment: .trailing, spacing: 4) {
                QuantityStepper(store: store, item: item)
                Text(Money.string(cents: item.priceCents * Double(qty)))
                    .font(Theme.caption)
            }
        }
    }

    private var summary: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Items")
                Spacer()
                Text("\(store.cartCount)")
            }
            .font(Theme.body)
            Divider()
            HStack {
                Text("Total")
                Spacer()
                Text(Money.string(cents: store.cartTotalCents))
            }
            .font(Theme.headline)
        }
        .card()
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
                pickupTime = ""
                tab = .orders
            } catch {
                errorMessage = error.plainMessage
            }
            isPlacing = false
        }
    }
}
