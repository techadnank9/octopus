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

    // MARK: Store

    func shops() -> AnyPublisher<[ShopSummary], ClientError> {
        client.subscribe(to: "store:shops", yielding: [ShopSummary].self)
    }

    func storefront(shopId: String, orderId: String?) -> AnyPublisher<Storefront, ClientError> {
        var args: [String: ConvexEncodable?] = ["shopId": shopId]
        if let orderId { args["orderId"] = orderId }
        return client.subscribe(to: "store:get", with: args, yielding: Storefront.self)
    }

    /// Returns the new order id.
    func placeOrder(
        shopId: String, name: String, requestedTime: String?, lines: [(name: String, qty: Int)]
    ) async throws -> String {
        let encodedLines: [ConvexEncodable?] = lines.map {
            ["name": $0.name, "qty": Double($0.qty)] as [String: ConvexEncodable?]
        }
        var args: [String: ConvexEncodable?] = [
            "shopId": shopId, "device": Device.id, "name": name, "lines": encodedLines,
        ]
        if let requestedTime { args["requestedTime"] = requestedTime }
        return try await client.action("store:placeOrder", with: args)
    }

    func review(shopId: String, rating: Int, text: String) async throws {
        try await client.mutation(
            "store:review",
            with: ["shopId": shopId, "device": Device.id, "rating": Double(rating), "text": text])
    }

    // MARK: Chat

    /// The chat channel id for this device.
    func channel() async throws -> String {
        let channels = client.subscribe(to: "store:channel", with: ["device": Device.id], yielding: String.self)
        for try await channel in channels.values { return channel }
        throw URLError(.badServerResponse)
    }

    func chatThread(shopId: String, channelId: String) -> AnyPublisher<[ChatMessage], ClientError> {
        client.subscribe(
            to: "chat:thread", with: ["shopId": shopId, "channelId": channelId], yielding: [ChatMessage].self)
    }

    func sendChat(shopId: String, channelId: String, text: String) async throws {
        try await client.action("chat:send", with: ["shopId": shopId, "channelId": channelId, "text": text])
    }
}
