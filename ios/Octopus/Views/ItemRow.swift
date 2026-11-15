import SwiftUI

/// One menu item: tap the name to edit, use the trailing controls to count stock.
struct ItemRow: View {
    let item: Item
    @ObservedObject var store: MenuStore
    let onEdit: () -> Void

    private static let lowStock = 3.0
    private static let startingStock = 10.0

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onEdit) {
                HStack {
                    Text(item.name)
                    if !item.available {
                        Text("Off")
                            .font(Theme.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Theme.ink.opacity(0.12), in: Capsule())
                    }
                    Spacer()
                    Text(Money.string(cents: item.priceCents))
                        .fontWeight(.bold)
                }
                .frame(minHeight: 44)
                .contentShape(Rectangle())
                .opacity(item.available ? 1 : 0.5)
            }
            .buttonStyle(.plain)
            if let stock = item.stock {
                stepper(stock)
            } else {
                Button("Count stock") { setStock(Self.startingStock) }
                    .font(Theme.caption)
                    .foregroundStyle(Theme.purple)
                    .frame(minHeight: 44)
                    .buttonStyle(.borderless)
            }
        }
        .font(Theme.body)
        .contextMenu {
            if item.stock != nil {
                Button("Stop counting") { setStock(nil) }
            }
            Button(item.available ? "Switch off" : "Put back on sale") {
                Task { await store.setAvailable(item, to: !item.available) }
            }
        }
    }

    private func stepper(_ stock: Double) -> some View {
        HStack(spacing: 0) {
            stepButton("minus", label: "Remove one") { setStock(stock - 1) }
                .disabled(stock <= 0)
            Text("\(Int(stock))")
                .fontWeight(.bold)
                .monospacedDigit()
                .foregroundStyle(stock <= Self.lowStock ? Theme.coral : Theme.ink)
                .frame(minWidth: 28)
                .contentTransition(.numericText())
                .animation(.default, value: stock)
            stepButton("plus", label: "Add one") { setStock(stock + 1) }
        }
        .buttonStyle(.borderless)
    }

    private func stepButton(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(Theme.caption)
                .foregroundStyle(Theme.purple)
                .frame(width: 36, height: 44)
                .contentShape(Rectangle())
        }
        .accessibilityLabel(label)
    }

    private func setStock(_ stock: Double?) {
        Task { await store.setStock(item, to: stock) }
    }
}
