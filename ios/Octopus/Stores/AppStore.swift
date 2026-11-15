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

    let ownerId = OwnerIdentity.id
    private var task: Task<Void, Never>?
    private var timeout: Task<Void, Never>?

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
        let shops = ConvexService.shared.shop(ownerId: ownerId).values
        task = Task { [weak self] in
            do {
                for try await shop in shops {
                    self?.phase = shop.map(Phase.ready) ?? .needsSetup
                }
            } catch {
                self?.phase = .failed(error.plainMessage)
            }
        }
        // The connection retries quietly, so stop waiting after a while and say so.
        timeout = Task { [weak self] in
            try? await Task.sleep(for: .seconds(30))
            guard !Task.isCancelled, self?.phase == .loading else { return }
            self?.phase = .failed("This is taking too long. Check your connection and try again.")
        }
    }

    func createShop(name: String, hours: String) async throws {
        let trimmedHours = hours.trimmingCharacters(in: .whitespacesAndNewlines)
        try await ConvexService.shared.createShop(
            ownerId: ownerId,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            hours: trimmedHours.isEmpty ? nil : trimmedHours)
    }

    func claimShop(code: String) async throws {
        _ = try await ConvexService.shared.claimShop(ownerId: ownerId, code: code)
    }
}
