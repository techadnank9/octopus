import Foundation

@MainActor
final class DashboardStore: ObservableObject {
    @Published private(set) var dashboard: Dashboard?
    @Published private(set) var errorMessage: String?

    private var task: Task<Void, Never>?

    init(shopId: String) {
        let updates = ConvexService.shared.dashboard(shopId: shopId).values
        task = Task { [weak self] in
            do {
                for try await dashboard in updates {
                    self?.dashboard = dashboard
                }
            } catch {
                self?.errorMessage = error.plainMessage
            }
        }
    }

    deinit {
        task?.cancel()
    }
}
