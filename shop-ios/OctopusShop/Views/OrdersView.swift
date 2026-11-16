import SwiftUI

struct OrdersView: View {
    @ObservedObject var store: ShopStore
    @Binding var tab: AppTab

    var body: some View {
        if let order = store.order {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Orders")
                        .font(Theme.largeTitle)
                        .foregroundStyle(Theme.ink)
                    OrderStatusCard(order: order) {
                        store.startNewOrder()
                        tab = .shop
                    }
                    if order.status == .ready {
                        ReviewRow(shopId: store.shopId)
                    }
                }
                .padding(16)
            }
            .scrollDismissesKeyboard(.interactively)
            .screenBackground()
        } else {
            EmptyState(symbol: "bag", title: "No orders yet", actionTitle: "Browse the shop") {
                tab = .shop
            }
        }
    }
}
