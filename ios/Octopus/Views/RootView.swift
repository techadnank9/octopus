import SwiftUI

struct RootView: View {
    @StateObject private var store = AppStore()

    var body: some View {
        Group {
            switch store.phase {
            case .loading:
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .needsSetup:
                WelcomeView(store: store)
            case .ready(let shop):
                MainTabView(shop: shop)
            case .failed(let message):
                VStack(spacing: 16) {
                    Text("We could not reach your shop")
                        .font(Theme.title)
                    Text(message)
                        .font(Theme.body)
                        .multilineTextAlignment(.center)
                    Button("Try again") { store.watchShop() }
                        .buttonStyle(PrimaryButtonStyle())
                }
                .foregroundStyle(Theme.ink)
                .padding(24)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .screenBackground()
        .onOpenURL { store.open(url: $0) }
    }
}
