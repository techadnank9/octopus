import SwiftUI

/// The shop's home: search, category chips and the product grid.
struct ShopView: View {
    @ObservedObject var store: ShopStore
    @Binding var tab: AppTab
    @State private var search = ""
    @State private var filter = Filter.all

    private enum Filter: Hashable {
        case all, favourites
        case category(String)
    }

    private struct Shelf: Identifiable {
        /// Nil when the grid is filtered and needs no header.
        let title: String?
        let items: [MenuItem]
        var id: String { title ?? "" }
    }

    private static let uncategorised = "More"
    private static let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(store.shop?.name ?? "")
                    .font(Theme.largeTitle)
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 16)
                if let message = store.errorMessage {
                    Text(message)
                        .font(Theme.caption)
                        .foregroundStyle(Theme.coral)
                        .padding(.horizontal, 16)
                }
                searchField
                    .padding(.horizontal, 16)
                chips
                grid
                    .padding(.horizontal, 16)
            }
            .padding(.vertical, 16)
        }
        .scrollDismissesKeyboard(.interactively)
        .screenBackground()
        .safeAreaInset(edge: .bottom) {
            if store.cartCount > 0 { cartBar }
        }
        .animation(.snappy, value: store.cartCount > 0)
        .onChange(of: store.favourites.isEmpty) {
            if store.favourites.isEmpty && filter == .favourites { filter = .all }
        }
    }

    // MARK: Data

    private var query: String {
        search.trimmingCharacters(in: .whitespaces)
    }

    /// Distinct categories in the order the menu first mentions them.
    private var categories: [String] {
        var seen = Set<String>()
        return store.items.compactMap(\.category).filter { seen.insert($0).inserted }
    }

    private var visibleItems: [MenuItem] {
        store.items.filter { item in
            let matchesFilter = switch filter {
            case .all: true
            case .favourites: store.favourites.contains(item.name)
            case .category(let name): item.category == name
            }
            return matchesFilter
                && (query.isEmpty || item.name.localizedCaseInsensitiveContains(query)
                    || (item.description ?? "").localizedCaseInsensitiveContains(query))
        }
    }

    private var shelves: [Shelf] {
        let items = visibleItems
        guard filter == .all, query.isEmpty else {
            return items.isEmpty ? [] : [Shelf(title: nil, items: items)]
        }
        let named = categories.map { name in
            Shelf(title: name, items: items.filter { $0.category == name })
        }
        let rest = items.filter { $0.category == nil }
        return rest.isEmpty ? named : named + [Shelf(title: Self.uncategorised, items: rest)]
    }

    // MARK: Parts

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Theme.ink.opacity(0.5))
            TextField("Search products", text: $search)
                .font(Theme.body)
                .autocorrectionDisabled()
            if !search.isEmpty {
                Button { search = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Theme.ink.opacity(0.4))
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.leading, 14)
        .padding(.trailing, search.isEmpty ? 14 : 0)
        .frame(minHeight: 50)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var chips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip("All", .all)
                ForEach(categories, id: \.self) { name in
                    chip(name, .category(name))
                }
                if !store.favourites.isEmpty {
                    chip("Favourites", .favourites)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private func chip(_ title: String, _ value: Filter) -> some View {
        let isSelected = filter == value
        return Button { filter = value } label: {
            Text(title)
                .font(Theme.caption)
                .foregroundStyle(isSelected ? .white : Theme.ink)
                .padding(.horizontal, 16)
                .frame(minHeight: 44)
                .background(isSelected ? Theme.ink : Theme.card, in: Capsule())
        }
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    @ViewBuilder
    private var grid: some View {
        if store.shop == nil && store.errorMessage == nil {
            ProgressView()
                .frame(maxWidth: .infinity, minHeight: 120)
        } else if shelves.isEmpty {
            Text(store.items.isEmpty ? "Nothing on the shelves yet." : "Nothing matches.")
                .font(Theme.body)
                .foregroundStyle(Theme.ink.opacity(0.6))
        } else {
            LazyVGrid(columns: Self.columns, alignment: .leading, spacing: 12) {
                ForEach(shelves) { shelf in
                    Section {
                        ForEach(shelf.items) { item in
                            ProductCard(store: store, item: item)
                        }
                    } header: {
                        if let title = shelf.title {
                            Text(title)
                                .font(Theme.title)
                                .foregroundStyle(Theme.ink)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.top, 8)
                                .accessibilityAddTraits(.isHeader)
                        }
                    }
                }
            }
        }
    }

    private var cartBar: some View {
        Button { tab = .cart } label: {
            HStack {
                Text("View cart")
                Spacer()
                Text(store.cartCount == 1 ? "1 item" : "\(store.cartCount) items")
                    .font(Theme.caption)
                    .opacity(0.85)
                Text(Money.string(cents: store.cartTotalCents))
            }
            .font(Theme.headline)
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .frame(maxWidth: .infinity, minHeight: 56)
            .background(Theme.purple, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .shadow(color: Theme.ink.opacity(0.18), radius: 12, y: 4)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}
