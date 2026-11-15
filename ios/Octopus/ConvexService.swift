import Combine
import ConvexMobile
import Foundation

/// Every backend call the app makes. Numbers are sent as Double (Convex float64).
/// Optional arguments are left out rather than sent as null.
struct ConvexService {
    static let shared = ConvexService()

    private let client: ConvexClient

    private init() {
        let url = Bundle.main.object(forInfoDictionaryKey: "CONVEX_URL") as? String ?? ""
        client = ConvexClient(deploymentUrl: url)
    }

    // MARK: Shops

    func shop(ownerId: String) -> AnyPublisher<Shop?, ClientError> {
        client.subscribe(to: "shops:mine", with: ["ownerId": ownerId], yielding: Shop?.self)
    }

    func createShop(ownerId: String, name: String, hours: String?) async throws {
        var args: [String: ConvexEncodable?] = ["ownerId": ownerId, "name": name]
        if let hours { args["hours"] = hours }
        let _: String = try await client.mutation("shops:create", with: args)
    }

    /// Links this device to a shop that was set up on the web. Returns the shop id.
    func claimShop(ownerId: String, code: String) async throws -> String {
        try await client.mutation("onboard:claim", with: ["ownerId": ownerId, "code": code])
    }

    // MARK: Items

    func items(shopId: String) -> AnyPublisher<[Item], ClientError> {
        client.subscribe(to: "items:list", with: ["shopId": shopId], yielding: [Item].self)
    }

    func saveItem(shopId: String, id: String?, name: String, priceCents: Double) async throws {
        var args: [String: ConvexEncodable?] = ["shopId": shopId, "name": name, "priceCents": priceCents]
        if let id { args["id"] = id }
        let _: String = try await client.mutation("items:save", with: args)
    }

    func removeItem(id: String) async throws {
        try await client.mutation("items:remove", with: ["id": id])
    }

    /// Pass nil to stop counting. Zero switches the item off.
    func setStock(id: String, stock: Double?) async throws {
        var args: [String: ConvexEncodable?] = ["id": id]
        if let stock { args["stock"] = stock }
        try await client.mutation("items:setStock", with: args)
    }

    func setAvailable(id: String, available: Bool) async throws {
        try await client.mutation("items:setAvailable", with: ["id": id, "available": available])
    }

    // MARK: Menu photo

    /// Uploads the photo, asks the backend to read it, and returns how many items were saved.
    func extractMenu(shopId: String, jpeg: Data) async throws -> Int {
        let uploadUrl: String = try await client.mutation("menu:generateUploadUrl")
        guard let url = URL(string: uploadUrl) else { throw URLError(.badURL) }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
        let (data, response) = try await URLSession.shared.upload(for: request, from: jpeg)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        let storageId = try JSONDecoder().decode(UploadResult.self, from: data).storageId
        let saved: Double = try await client.action(
            "menu:extract", with: ["shopId": shopId, "storageId": storageId])
        return Int(saved)
    }

    private struct UploadResult: Decodable {
        let storageId: String
    }

    // MARK: Orders

    func orders(shopId: String) -> AnyPublisher<[Order], ClientError> {
        client.subscribe(to: "orders:list", with: ["shopId": shopId], yielding: [Order].self)
    }

    func setStatus(orderId: String, status: OrderStatus) async throws {
        try await client.mutation("orders:setStatus", with: ["orderId": orderId, "status": status.rawValue])
    }

    func markPaidDemo(orderId: String) async throws {
        try await client.mutation("orders:markPaidDemo", with: ["orderId": orderId])
    }

    func createDemoOrder(shopId: String) async throws {
        try await client.mutation("orders:createDemo", with: ["shopId": shopId])
    }

    // MARK: Dashboard

    func dashboard(shopId: String) -> AnyPublisher<Dashboard, ClientError> {
        client.subscribe(to: "dashboard:get", with: ["shopId": shopId], yielding: Dashboard.self)
    }

    func suite(shopId: String) -> AnyPublisher<Suite, ClientError> {
        client.subscribe(to: "dashboard:suite", with: ["shopId": shopId], yielding: Suite.self)
    }

    /// Runs one dashboard action and returns a sentence saying what happened.
    func runDashboard(
        shopId: String, action: String, id: String?, text: String?, rate: Double?
    ) async throws -> String {
        var args: [String: ConvexEncodable?] = ["shopId": shopId, "action": action]
        if let id { args["id"] = id }
        if let text { args["text"] = text }
        if let rate { args["rate"] = rate }
        return try await client.action("dashboard:run", with: args)
    }

    // MARK: Arms

    func armCounts(shopId: String) -> AnyPublisher<[Double], ClientError> {
        client.subscribe(to: "events:countsToday", with: ["shopId": shopId], yielding: [Double].self)
    }

    // MARK: Chat

    func chatThread(shopId: String, channelId: String) -> AnyPublisher<[ChatMessage], ClientError> {
        client.subscribe(
            to: "chat:thread", with: ["shopId": shopId, "channelId": channelId], yielding: [ChatMessage].self)
    }

    func sendChat(shopId: String, channelId: String, text: String) async throws {
        try await client.action("chat:send", with: ["shopId": shopId, "channelId": channelId, "text": text])
    }

    func sendOwner(shopId: String, text: String) async throws {
        try await client.action("owner:send", with: ["shopId": shopId, "text": text])
    }
}
