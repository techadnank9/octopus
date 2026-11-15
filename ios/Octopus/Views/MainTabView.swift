import SwiftUI

struct MainTabView: View {
    let shop: Shop
    @StateObject private var orders: OrdersStore

    init(shop: Shop) {
        self.shop = shop
        _orders = StateObject(wrappedValue: OrdersStore(shopId: shop.id))
    }

    var body: some View {
        TabView {
            OrdersView(store: orders)
                .tabItem { Label("Orders", systemImage: "tray.full.fill") }
            MenuView(shopId: shop.id)
                .tabItem { Label("Menu", systemImage: "camera.fill") }
            NumberView(shop: shop)
                .tabItem { Label("Number", systemImage: "qrcode") }
            ArmsView(shopId: shop.id)
                .tabItem { Label("Arms", systemImage: "sparkles") }
            ChatView(shopId: shop.id)
                .tabItem { Label("Chat", systemImage: "message") }
        }
    }
}
