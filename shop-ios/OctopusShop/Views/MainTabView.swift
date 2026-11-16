import SwiftUI

struct MainTabView: View {
    @StateObject private var store: ShopStore

    init(shopId: String) {
        _store = StateObject(wrappedValue: ShopStore(shopId: shopId))
    }

    var body: some View {
        TabView {
            MenuView(store: store)
                .tabItem { Label("Menu", systemImage: "menucard") }
            AskView(shopId: store.shopId)
                .tabItem { Label("Ask", systemImage: "bubble.left.and.bubble.right") }
            BookView(shopId: store.shopId)
                .tabItem { Label("Book", systemImage: "calendar") }
            ReviewView(shopId: store.shopId)
                .tabItem { Label("Review", systemImage: "star") }
        }
    }
}
