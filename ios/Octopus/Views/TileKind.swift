import Foundation

/// The twelve business functions on the dashboard. The raw value is the badge number.
enum TileKind: Int, CaseIterable, Identifiable {
    case service = 1, sales, payments, receipts, memory, updates
    case bookings, marketing, bookkeeping, inventory, reviews, taxes

    var id: Int { rawValue }

    var title: String {
        switch self {
        case .service: "Customer service"
        case .sales: "Sales and orders"
        case .payments: "Payments"
        case .receipts: "Invoices and receipts"
        case .memory: "Customer memory"
        case .updates: "Order updates"
        case .bookings: "Bookings and reminders"
        case .marketing: "Marketing"
        case .bookkeeping: "Bookkeeping"
        case .inventory: "Inventory and suppliers"
        case .reviews: "Reviews and reputation"
        case .taxes: "Taxes and compliance"
        }
    }

    var line: String {
        switch self {
        case .service: "Answers questions by text, at any hour"
        case .sales: "Takes the order, confirms items and total"
        case .payments: "Sends a pay link, marks the order paid"
        case .receipts: "Receipt after payment, invoice for any order"
        case .memory: "Remembers each customer's usual"
        case .updates: "Texts accepted and ready"
        case .bookings: "Books slots by text and reminds customers"
        case .marketing: "Announces specials, wins back quiet regulars"
        case .bookkeeping: "Logs every sale, sends your daily total"
        case .inventory: "Counts stock, tells you what to reorder"
        case .reviews: "Asks for reviews, drafts your replies"
        case .taxes: "Keeps tidy records of sales and tax"
        }
    }

    /// The live number on the tile and the caption under it.
    @MainActor func stat(dashboard: Dashboard?, store: SuiteStore) -> (value: String, caption: String) {
        let suite = store.suite
        func whole(_ number: Double?) -> String { String(Int(number ?? 0)) }
        func money(_ cents: Double?) -> String { Money.string(cents: cents ?? 0) }
        switch self {
        case .service: return (whole(store.count(at: 1)), "answered today")
        case .sales: return (whole(dashboard?.today.orders), "orders today")
        case .payments: return (money(dashboard?.today.paidCents), "collected")
        case .receipts: return (whole(suite?.receipts), "receipts sent")
        case .memory: return (whole(Double(dashboard?.customers.count ?? 0)), "customers known")
        case .updates: return (whole(store.count(at: 6)), "updates sent")
        case .bookings: return (whole(Double(suite?.bookings.filter(\.isBooked).count ?? 0)), "booked")
        case .marketing: return (whole(suite?.audience.all), "you can text")
        case .bookkeeping: return (money(suite?.tax.grossCents), "sales today")
        case .inventory: return (whole(Double(suite?.reorder.count ?? 0)), "to reorder")
        case .reviews:
            let ratings = suite?.reviews.map(\.rating) ?? []
            let average = ratings.isEmpty ? "0" : String(format: "%.1f", ratings.reduce(0, +) / Double(ratings.count))
            return (average, ratings.count == 1 ? "1 review" : "\(ratings.count) reviews")
        case .taxes: return (money(suite?.tax.taxCents), "tax in sales")
        }
    }
}
