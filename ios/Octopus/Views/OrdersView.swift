import SwiftUI

struct OrdersView: View {
    @ObservedObject var store: OrdersStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    if let message = store.errorMessage {
                        Text(message)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.coral)
                    }
                    if store.hasLoaded && store.orders.isEmpty {
                        Text("No orders yet. Share your shop number to get the first one.")
                            .font(Theme.body)
                            .foregroundStyle(Theme.ink.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(.top, 80)
                            .padding(.horizontal, 24)
                    }
                    ForEach(store.orders) { order in
                        OrderCard(order: order, store: store)
                            .transition(.move(edge: .top).combined(with: .opacity))
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
