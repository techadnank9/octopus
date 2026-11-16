import SwiftUI

/// Fills whatever frame it is given. Shows the item's first letter on a soft tile
/// when there is no photo, or while one loads.
struct ProductPhoto: View {
    let item: MenuItem

    var body: some View {
        Theme.purple.opacity(0.1)
            .overlay {
                Text(item.name.prefix(1).uppercased())
                    .font(Theme.largeTitle)
                    .foregroundStyle(Theme.purple.opacity(0.55))
                    .minimumScaleFactor(0.4)
                    .padding(6)
            }
            .overlay {
                if let imageUrl = item.imageUrl, let url = URL(string: imageUrl) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image
                                .resizable()
                                .scaledToFill()
                                .background(Color.white)
                        }
                    }
                }
            }
            .clipped()
            .accessibilityHidden(true)
    }
}
