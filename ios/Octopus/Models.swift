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
    /// Units left. Nil when the owner is not counting this item.
    @OptionalConvexFloat var stock: Double?
    /// The menu section this item belongs to, for example "Rice and grains".
    let category: String?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, priceCents, description, available, stock, category
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

struct Dashboard: Decodable, Equatable {
    let today: DayStats
    let topSellers: [TopSeller]
    let alerts: [String]
    let customers: [Customer]
}

struct DayStats: Decodable, Equatable {
    @ConvexFloat var orders: Double
    @ConvexFloat var paidCents: Double
    @ConvexFloat var unpaidCents: Double
    @ConvexFloat var averageCents: Double
}

struct TopSeller: Decodable, Equatable {
    let name: String
    @ConvexFloat var qty: Double
}

struct Customer: Decodable, Equatable {
    let name: String
    @ConvexFloat var orders: Double
    @ConvexFloat var spentCents: Double
    let usual: String?
}

struct Suite: Decodable, Equatable {
    let sales: [Sale]
    let tax: TaxSummary
    @ConvexFloat var receipts: Double
    @ConvexFloat var unpaid: Double
    let bookings: [Booking]
    let reviews: [Review]
    let reorder: [ReorderLine]
    let audience: Audience
}

struct Sale: Decodable, Equatable, Identifiable {
    let id: String
    @ConvexFloat var at: Double
    let customer: String
    let items: String
    @ConvexFloat var totalCents: Double
    let paid: Bool
}

struct TaxSummary: Decodable, Equatable {
    /// Percent, for example 8.5.
    @ConvexFloat var rate: Double
    @ConvexFloat var grossCents: Double
    @ConvexFloat var taxCents: Double
    @ConvexFloat var netCents: Double
}

struct Booking: Decodable, Equatable, Identifiable {
    let id: String
    let customer: String
    let service: String
    let when: String
    let status: String
    let reminded: Bool

    var isBooked: Bool { status == "booked" }
}

struct Review: Decodable, Equatable, Identifiable {
    let id: String
    let customer: String
    @ConvexFloat var rating: Double
    let text: String
    let reply: String?
}

struct ReorderLine: Decodable, Equatable {
    let name: String
    @ConvexFloat var left: Double
}

struct Audience: Decodable, Equatable {
    @ConvexFloat var all: Double
    @ConvexFloat var quiet: Double
}
