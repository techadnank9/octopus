import Foundation

enum Money {
    /// ISO 4217 code of the open shop. Set when the shop loads.
    static var currencyCode = "USD"

    static func string(cents: Double) -> String {
        (cents / 100).formatted(.currency(code: currencyCode))
    }

    /// Parses owner input such as "4.50" or "$4.50" into cents.
    static func cents(from text: String) -> Double? {
        let cleaned = text.filter { $0.isNumber || $0 == "." }
        guard let amount = Double(cleaned), amount >= 0 else { return nil }
        return (amount * 100).rounded()
    }

    static func input(cents: Double) -> String {
        String(format: "%.2f", cents / 100)
    }
}
