import SwiftUI

struct MenuItemRow: View {
    @ObservedObject var store: ShopStore
    let item: MenuItem

    private var isFavourite: Bool { store.favourites.contains(item.name) }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                if let imageUrl = item.imageUrl, let url = URL(string: imageUrl) {
                    thumbnail(url)
                        .padding(.trailing, 4)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name)
                        .font(Theme.headline)
                    if let description = item.description, !description.isEmpty {
                        Text(description)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.ink.opacity(0.6))
                    }
                }
                Spacer()
                Button { store.toggleFavourite(item) } label: {
                    Image(systemName: isFavourite ? "heart.fill" : "heart")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Theme.purple)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(isFavourite ? "Remove \(item.name) from favourites" : "Add \(item.name) to favourites")
            }
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(Money.string(cents: item.priceCents))
                        .font(Theme.body)
                    if item.isSoldOut {
                        Text("Sold out")
                            .font(Theme.caption)
                    } else if let stock = item.stock, stock <= 3 {
                        Text("only \(Int(stock)) left")
                            .font(Theme.caption)
                            .foregroundStyle(Theme.coral)
                    }
                }
                Spacer()
                if !item.isSoldOut { stepper }
            }
        }
        .foregroundStyle(Theme.ink)
        .card()
        .opacity(item.isSoldOut ? 0.5 : 1)
    }

    private func thumbnail(_ url: URL) -> some View {
        let shape = RoundedRectangle(cornerRadius: 14, style: .continuous)
        return AsyncImage(url: url) { phase in
            if let image = phase.image {
                image
                    .resizable()
                    .scaledToFill()
            } else {
                Theme.ink.opacity(0.06)
            }
        }
        .frame(width: 72, height: 72)
        .background(Color.white)
        .clipShape(shape)
        .overlay(shape.strokeBorder(Theme.ink.opacity(0.12), lineWidth: 1))
        .accessibilityHidden(true)
    }

    private var stepper: some View {
        HStack(spacing: 4) {
            let quantity = store.quantity(of: item)
            if quantity > 0 {
                stepButton("minus", label: "Remove one \(item.name)") { store.remove(item) }
                Text("\(quantity)")
                    .font(Theme.headline)
                    .monospacedDigit()
                    .frame(minWidth: 28)
            }
            stepButton("plus", label: "Add one \(item.name)") { store.add(item) }
                .disabled(!store.canAdd(item))
                .opacity(store.canAdd(item) ? 1 : 0.4)
        }
    }

    private func stepButton(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 17, weight: .heavy))
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(Theme.purple, in: Circle())
        }
        .accessibilityLabel(label)
    }
}
