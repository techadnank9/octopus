import SwiftUI

struct RootView: View {
    @AppStorage(Device.shopKey) private var shopId = ""

    var body: some View {
        Group {
            if shopId.isEmpty {
                ShopPickerView()
            } else {
                MainTabView(shopId: shopId)
                    .id(shopId)
            }
        }
        .onOpenURL(perform: open)
    }

    /// Handles octopusshop://shop/<shopId>.
    private func open(_ url: URL) {
        guard url.host == "shop", let id = url.pathComponents.dropFirst().first else { return }
        shopId = id
    }
}
