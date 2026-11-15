import SwiftUI

struct OrdersView: View {
    @ObservedObject var store: OrdersStore
    @StateObject private var dashboard: DashboardStore

    init(store: OrdersStore, shopId: String) {
        self.store = store
        _dashboard = StateObject(wrappedValue: DashboardStore(shopId: shopId))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    if let message = store.errorMessage ?? dashboard.errorMessage {
                        Text(message)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.coral)
                    }
                    if let summary = dashboard.dashboard {
                        DashboardSummary(dashboard: summary)
                    }
                    if store.hasLoaded && store.orders.isEmpty {
                        Text("No orders yet. Share your shop number to get the first one.")
                            .font(Theme.body)
                            .foregroundStyle(Theme.ink.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(24)
                    }
                    ForEach(store.orders) { order in
                        OrderCard(order: order, store: store)
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }
                    if let summary = dashboard.dashboard {
                        DashboardLists(dashboard: summary)
                    }
                }
                .padding(16)
            }
            .screenBackground()
            .navigationTitle("Orders")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add test order") {
                        Task { await store.addTestOrder() }
                    }
                    .font(Theme.caption)
                }
            }
        }
    }
}
