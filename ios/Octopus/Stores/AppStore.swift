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

    init() {
        watchShop()
    }

    deinit {
        task?.cancel()
    }

    func watchShop() {
        task?.cancel()
        phase = .loading
        let shops = ConvexService.shared.shop(ownerId: ownerId).values
        task = Task { [weak self] in
            do {
                for try await shop in shops {
                    self?.phase = shop.map(Phase.ready) ?? .needsSetup
                }
            } catch {
                self?.phase = .failed(error.localizedDescription)
            }
        }
    }

    func createShop(name: String, hours: String) async throws {
        let trimmedHours = hours.trimmingCharacters(in: .whitespacesAndNewlines)
        try await ConvexService.shared.createShop(
            ownerId: ownerId,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            hours: trimmedHours.isEmpty ? nil : trimmedHours)
    }
}
