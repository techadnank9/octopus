import ConvexMobile
import Foundation

struct ShopSummary: Decodable, Equatable, Identifiable {
    let id: String
    let name: String
    @ConvexFloat var items: Double
    let textLine: Bool
}

struct Storefront: Decodable, Equatable {
    let shop: ShopInfo
    let items: [MenuItem]
    let order: CustomerOrder?
}

struct ShopInfo: Decodable, Equatable {
    let name: String
    let currency: String
    let hours: String?
}

struct MenuItem: Decodable, Equatable, Identifiable {
    let name: String
    @ConvexFloat var priceCents: Double
    let description: String?
    let available: Bool
    /// Units left. Nil when the shop is not counting this item.
    @OptionalConvexFloat var stock: Double?

    var id: String { name }
    var isSoldOut: Bool { !available || stock == 0 }
}

enum OrderStatus: String, Decodable {
    case new, accepted, ready, cancelled
}

struct CustomerOrder: Decodable, Equatable {
    let lines: [String]
    @ConvexFloat var totalCents: Double
    let status: OrderStatus
    let paid: Bool
    let paymentLink: String?
    let requestedTime: String?
}

enum ChatRole: String, Decodable {
    case customer, agent
}

struct ChatMessage: Decodable, Equatable, Identifiable {
    let id: String
    let role: ChatRole
    let text: String
    let link: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case role, text, link
    }
}
