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
            ArmsView(shop: shop)
                .tabItem { Label("Home", systemImage: "house.fill") }
            OrdersView(store: orders, shopId: shop.id)
                .tabItem { Label("Orders", systemImage: "tray.full.fill") }
            MenuView(shopId: shop.id)
                .tabItem { Label("Menu", systemImage: "camera.fill") }
            NumberView(shop: shop)
                .tabItem { Label("Number", systemImage: "qrcode") }
            ChatView(shopId: shop.id)
                .tabItem { Label("Octopus", systemImage: "bubble.left.and.text.bubble.right") }
        }
    }
}
