import Foundation

/// Live numbers behind the business dashboard, and the actions its sheets can run.
@MainActor
final class SuiteStore: ObservableObject {
    @Published private(set) var suite: Suite?
    @Published private(set) var counts: [Double] = []
    @Published private(set) var isRunning = false
    @Published private(set) var errorMessage: String?
    /// What the last action did, or why it failed.
    @Published var message: String?

    private let shopId: String
    private var tasks: [Task<Void, Never>] = []

    init(shopId: String) {
        self.shopId = shopId
        let suites = ConvexService.shared.suite(shopId: shopId).values
        let counts = ConvexService.shared.armCounts(shopId: shopId).values
        tasks = [
            Task { [weak self] in
                do {
                    for try await suite in suites { self?.suite = suite }
                } catch {
                    self?.errorMessage = error.plainMessage
                }
            },
            Task { [weak self] in
                do {
                    for try await latest in counts { self?.counts = latest }
                } catch {
                    self?.errorMessage = error.plainMessage
                }
            },
        ]
    }

    deinit {
        tasks.forEach { $0.cancel() }
    }

    func count(at index: Int) -> Double {
        index < counts.count ? counts[index] : 0
    }

    func run(_ action: String, id: String? = nil, text: String? = nil, rate: Double? = nil) async {
        isRunning = true
        do {
            message = try await ConvexService.shared.runDashboard(
                shopId: shopId, action: action, id: id, text: text, rate: rate)
        } catch {
            message = error.plainMessage
        }
        isRunning = false
    }

    /// Runs an action whose answer is shown on the page instead of in an alert. Nil when it failed.
    func draft(_ action: String) async -> String? {
        isRunning = true
        defer { isRunning = false }
        do {
            return try await ConvexService.shared.runDashboard(
                shopId: shopId, action: action, id: nil, text: nil, rate: nil)
        } catch {
            message = error.plainMessage
            return nil
        }
    }
}
