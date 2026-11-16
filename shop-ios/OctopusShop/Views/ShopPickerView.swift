import SwiftUI

struct ShopPickerView: View {
    @AppStorage(Device.shopKey) private var shopId = ""
    @State private var shops: [ShopSummary]?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Image("Octopus")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 120)
                    .frame(maxWidth: .infinity)
                    .accessibilityHidden(true)
                Text("Choose a shop")
                    .font(Theme.largeTitle)
                    .foregroundStyle(Theme.ink)
                if let errorMessage {
                    Text(errorMessage)
                        .font(Theme.caption)
                        .foregroundStyle(Theme.coral)
                } else if let shops {
                    if shops.isEmpty {
                        Text("No shops are open yet.")
                            .font(Theme.body)
                            .foregroundStyle(Theme.ink.opacity(0.6))
                    }
                    ForEach(shops) { shop in
                        Button { shopId = shop.id } label: { row(shop) }
                    }
                } else {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(20)
        }
        .screenBackground()
        .task {
            do {
                for try await shops in ConvexService.shared.shops().values {
                    self.shops = shops
                }
            } catch {
                errorMessage = error.plainMessage
            }
        }
    }

    private func row(_ shop: ShopSummary) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(shop.name)
                    .font(Theme.headline)
                    .foregroundStyle(Theme.ink)
                Text(Int(shop.items) == 1 ? "1 item" : "\(Int(shop.items)) items")
                    .font(Theme.caption)
                    .foregroundStyle(Theme.ink.opacity(0.6))
            }
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(Theme.purple)
        }
        .frame(minHeight: 50)
        .card()
    }
}
