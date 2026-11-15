import ConvexMobile
import Foundation

struct Shop: Decodable, Equatable {
    let id: String
    let name: String
    let hours: String?
    let channelLink: String?
    let currency: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, hours, channelLink, currency
    }
}

struct Item: Decodable, Equatable, Identifiable {
    let id: String
    let name: String
    @ConvexFloat var priceCents: Double
    let description: String?
    let available: Bool

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, priceCents, description, available
    }
}

struct OrderLine: Decodable, Equatable {
    let name: String
    @ConvexFloat var qty: Double
    @ConvexFloat var priceCents: Double
}

enum OrderStatus: String, Decodable {
    case new, accepted, ready, cancelled
}

enum PaymentStatus: String, Decodable {
    case unpaid, paid
}

struct Order: Decodable, Equatable, Identifiable {
    let id: String
    let customerName: String
    let lines: [OrderLine]
    @ConvexFloat var totalCents: Double
    let requestedTime: String?
    let status: OrderStatus
    let paymentStatus: PaymentStatus
    let paymentLink: String?
    @ConvexFloat var creationTime: Double

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case customerName, lines, totalCents, requestedTime, status, paymentStatus, paymentLink
        case creationTime = "_creationTime"
    }
}

enum ChatRole: String, Decodable {
    case customer, agent
}

struct ChatMessage: Decodable, Equatable, Identifiable {
    let id: String
    let role: ChatRole
    let text: String
    let link: String?
    @ConvexFloat var creationTime: Double

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case role, text, link
        case creationTime = "_creationTime"
    }
}
