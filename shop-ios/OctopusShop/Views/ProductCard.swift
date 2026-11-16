import SwiftUI

/// One product in the shop grid.
struct ProductCard: View {
    @ObservedObject var store: ShopStore
    let item: MenuItem

    private var isFavourite: Bool { store.favourites.contains(item.name) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Color.clear
                .aspectRatio(1, contentMode: .fit)
                .overlay { ProductPhoto(item: item) }
                .clipped()
                .overlay(alignment: .topTrailing) { heart }
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(Theme.body)
                    .lineLimit(2, reservesSpace: true)
                    .multilineTextAlignment(.leading)
                Text(Money.string(cents: item.priceCents))
                    .font(Theme.headline)
                HStack(alignment: .bottom) {
                    note
                    Spacer(minLength: 0)
                    if !item.isSoldOut {
                        QuantityStepper(store: store, item: item)
                    }
                }
                .frame(minHeight: 44)
            }
            .padding(12)
        }
        .foregroundStyle(Theme.ink)
        .background(Theme.card)
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
        .opacity(item.isSoldOut ? 0.5 : 1)
    }

    @ViewBuilder
    private var note: some View {
        if item.isSoldOut {
            Text("Sold out")
                .font(Theme.caption)
        } else if let stock = item.stock, stock <= 3 {
            Text("only \(Int(stock)) left")
                .font(Theme.caption)
                .foregroundStyle(Theme.coral)
        }
    }

    private var heart: some View {
        Button { store.toggleFavourite(item) } label: {
            Image(systemName: isFavourite ? "heart.fill" : "heart")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(Theme.purple)
                .frame(width: 34, height: 34)
                .background(.white.opacity(0.92), in: Circle())
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel(isFavourite ? "Remove \(item.name) from favourites" : "Add \(item.name) to favourites")
    }
}
