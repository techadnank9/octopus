import Foundation

@MainActor
final class AppStore: ObservableObject {
    enum Phase: Equatable {
        case loading
        case needsSetup
        case ready(Shop)
        case failed(String)
    }

    @Published private(set) var phase: Phase = .loading

    static let openShopKey = "openShopId"

    let ownerId = OwnerIdentity.id
    private var task: Task<Void, Never>?
    private var timeout: Task<Void, Never>?
    private var attempts = 0

    init() {
        watchShop()
    }

    deinit {
        task?.cancel()
        timeout?.cancel()
    }

    func watchShop() {
        task?.cancel()
        timeout?.cancel()
        phase = .loading
        let openShopId = UserDefaults.standard.string(forKey: Self.openShopKey)
        let shops = openShopId.map { ConvexService.shared.shop(id: $0).values }
            ?? ConvexService.shared.shop(ownerId: ownerId).values
        task = Task { [weak self] in
            do {
                for try await shop in shops {
                    self?.attempts = 0
                    if shop == nil, openShopId != nil {
                        // The linked shop is gone, so go back to this device's own shop.
                        UserDefaults.standard.removeObject(forKey: Self.openShopKey)
                        self?.watchShop()
                        return
                    }
                    Money.currencyCode = (shop?.currency ?? "usd").uppercased()
                    self?.phase = shop.map(Phase.ready) ?? .needsSetup
                }
            } catch {
                self?.phase = .failed(error.plainMessage)
            }
        }
        // The first subscription after launch sometimes never answers, so ask again a few times before giving up.
        timeout = Task { [weak self] in
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled, let self, self.phase == .loading else { return }
            if self.attempts < 6 {
                self.attempts += 1
                self.watchShop()
            } else {
                self.phase = .failed("This is taking too long. Check your connection and try again.")
            }
        }
    }

    /// Opens the shop named in a link like octopus://shop/<shopId>.
    func open(url: URL) {
        guard url.scheme == "octopus", url.host == "shop" else { return }
        let shopId = url.pathComponents.first { $0 != "/" } ?? ""
        guard !shopId.isEmpty else { return }
        UserDefaults.standard.set(shopId, forKey: Self.openShopKey)
        attempts = 0
        watchShop()
    }

    func createShop(name: String) async throws {
        try await ConvexService.shared.createShop(
            ownerId: ownerId,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            hours: nil)
    }

    func claimShop(code: String) async throws {
        _ = try await ConvexService.shared.claimShop(ownerId: ownerId, code: code)
    }
}
