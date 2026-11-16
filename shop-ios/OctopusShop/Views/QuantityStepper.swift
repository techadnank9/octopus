import SwiftUI

/// A round "+" that grows into "− n +" once the item is in the cart.
struct QuantityStepper: View {
    @ObservedObject var store: ShopStore
    let item: MenuItem

    var body: some View {
        let quantity = store.quantity(of: item)
        HStack(spacing: 0) {
            if quantity > 0 {
                button("minus", label: "Remove one \(item.name)") { store.remove(item) }
                Text("\(quantity)")
                    .font(Theme.headline)
                    .monospacedDigit()
                    .foregroundStyle(.white)
                    .frame(minWidth: 24)
            }
            button("plus", label: "Add one \(item.name)") { store.add(item) }
                .disabled(!store.canAdd(item))
                .opacity(store.canAdd(item) ? 1 : 0.4)
        }
        .background(Theme.purple, in: Capsule())
        .animation(.snappy(duration: 0.2), value: quantity)
    }

    private func button(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .heavy))
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel(label)
    }
}
