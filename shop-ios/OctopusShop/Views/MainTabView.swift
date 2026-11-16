import SwiftUI

enum AppTab: Hashable {
    case shop, cart, orders, ask
}

struct MainTabView: View {
    @StateObject private var store: ShopStore
    @State private var tab = AppTab.shop

    init(shopId: String) {
        _store = StateObject(wrappedValue: ShopStore(shopId: shopId))
    }

    var body: some View {
        TabView(selection: $tab) {
            ShopView(store: store, tab: $tab)
                .tabItem { Label("Shop", systemImage: "storefront") }
                .tag(AppTab.shop)
            CartView(store: store, tab: $tab)
                .tabItem { Label("Cart", systemImage: "cart") }
                .badge(store.cartCount)
                .tag(AppTab.cart)
            OrdersView(store: store, tab: $tab)
                .tabItem { Label("Orders", systemImage: "bag") }
                .tag(AppTab.orders)
            AskView(shopId: store.shopId)
                .tabItem { Label("Ask", systemImage: "bubble.left.and.bubble.right") }
                .tag(AppTab.ask)
        }
    }
}
