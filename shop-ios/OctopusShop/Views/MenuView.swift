import SwiftUI

struct MenuView: View {
    @ObservedObject var store: ShopStore
    @AppStorage(Device.shopKey) private var shopId = ""
    @State private var search = ""
    @State private var favouritesOnly = false
    @State private var showsCheckout = false

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    if let message = store.errorMessage {
                        Text(message)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.coral)
                    }
                    if let order = store.order {
                        OrderStatusCard(order: order, startNew: store.startNewOrder)
                    }
                    filters
                    ForEach(visibleItems) { item in
                        MenuItemRow(store: store, item: item)
                    }
                    if store.shop != nil && visibleItems.isEmpty {
                        Text(favouritesOnly ? "No favourites yet." : "Nothing matches.")
                            .font(Theme.body)
                            .foregroundStyle(Theme.ink.opacity(0.6))
                    }
                }
                .padding(16)
            }
            .scrollDismissesKeyboard(.interactively)
            .screenBackground()
            .safeAreaInset(edge: .bottom) { reviewBar }
            .navigationTitle(store.shop?.name ?? "")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.ink, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Change shop") { shopId = "" }
                        .font(Theme.caption)
                        .tint(.white)
                }
            }
            .sheet(isPresented: $showsCheckout) {
                CheckoutSheet(store: store)
            }
        }
    }

    private var visibleItems: [MenuItem] {
        let query = search.trimmingCharacters(in: .whitespaces)
        return store.items.filter { item in
            (!favouritesOnly || store.favourites.contains(item.name))
                && (query.isEmpty || item.name.localizedCaseInsensitiveContains(query)
                    || (item.description ?? "").localizedCaseInsensitiveContains(query))
        }
    }

    private var filters: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(Theme.ink.opacity(0.5))
                TextField("Search the menu", text: $search)
                    .font(Theme.body)
                    .autocorrectionDisabled()
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 50)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            Button { favouritesOnly.toggle() } label: {
                Label("Favourites", systemImage: favouritesOnly ? "heart.fill" : "heart")
                    .font(Theme.caption)
                    .foregroundStyle(favouritesOnly ? .white : Theme.purple)
                    .padding(.horizontal, 14)
                    .frame(minHeight: 44)
                    .background(favouritesOnly ? Theme.purple : Theme.card, in: Capsule())
            }
        }
    }

    private var reviewBar: some View {
        Button { showsCheckout = true } label: {
            if store.cartCount == 0 {
                Text("Add something")
            } else {
                HStack {
                    Text("Review order (\(store.cartCount))")
                    Spacer()
                    Text(Money.string(cents: store.cartTotalCents))
                }
                .padding(.horizontal, 18)
            }
        }
        .buttonStyle(PrimaryButtonStyle(color: store.cartCount == 0 ? Theme.ink.opacity(0.3) : Theme.purple))
        .disabled(store.cartCount == 0)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Theme.background)
    }
}
