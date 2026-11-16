import SwiftUI

/// The business dashboard: the mascot on top, one tile per business function below.
struct ArmsView: View {
    let shop: Shop

    @StateObject private var dashboard: DashboardStore
    @StateObject private var store: SuiteStore

    private static let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible())]
    private static let heroShare = 0.4
    private static let nameHeight: CGFloat = 56

    init(shop: Shop) {
        self.shop = shop
        _dashboard = StateObject(wrappedValue: DashboardStore(shopId: shop.id))
        _store = StateObject(wrappedValue: SuiteStore(shopId: shop.id))
    }

    var body: some View {
        NavigationStack {
            GeometryReader { screen in
                let heroHeight = screen.size.height * Self.heroShare
                ZStack(alignment: .top) {
                    hero(height: heroHeight)
                    ScrollView {
                        tiles
                            .frame(minHeight: screen.size.height - heroHeight, alignment: .top)
                            .background(
                                Theme.background,
                                in: UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28))
                            .padding(.top, heroHeight)
                    }
                }
            }
            .background(Theme.ink.ignoresSafeArea())
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: TileKind.self) { kind in
                if kind == .service {
                    InboxView(shopId: shop.id)
                } else {
                    TileDetailView(kind: kind, dashboard: dashboard.dashboard, store: store)
                }
            }
        }
    }

    private func hero(height: CGFloat) -> some View {
        VStack(spacing: 0) {
            OctopusMascotView(height: max(height - Self.nameHeight, 0))
            Text(shop.name)
                .font(Theme.largeTitle)
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .padding(.horizontal, 16)
                .frame(height: Self.nameHeight)
        }
    }

    private var tiles: some View {
        VStack(spacing: 12) {
            if let message = store.errorMessage ?? dashboard.errorMessage {
                Text(message)
                    .font(Theme.caption)
                    .foregroundStyle(Theme.coral)
            }
            LazyVGrid(columns: Self.columns, spacing: 12) {
                ForEach(TileKind.allCases) { kind in
                    let stat = kind.stat(dashboard: dashboard.dashboard, store: store)
                    NavigationLink(value: kind) {
                        ArmTile(kind: kind, value: stat.value, caption: stat.caption)
                    }
                    .buttonStyle(.plain)
                }
            }
            Text("Eight arms. One shop. Zero staff.")
                .font(Theme.headline)
                .foregroundStyle(Theme.purple)
                .padding(.vertical, 16)
        }
        .padding(16)
    }
}
