import Foundation

enum Money {
    /// ISO 4217 code of the open shop. Set when the shop loads.
    static var currencyCode = "USD"

    static func string(cents: Double) -> String {
        (cents / 100).formatted(.currency(code: currencyCode))
    }
}
