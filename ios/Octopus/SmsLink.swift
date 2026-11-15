import Foundation

/// Reads the number and the pre-typed text out of an sms: link.
struct SmsLink {
    let number: String
    let body: String?

    init?(_ link: String) {
        guard link.lowercased().hasPrefix("sms:") else { return nil }
        let rest = link.dropFirst(4).drop { $0 == "/" }
        let split = rest.firstIndex { "?&;".contains($0) } ?? rest.endIndex
        let rawNumber = rest[..<split].removingPercentEncoding ?? String(rest[..<split])
        guard !rawNumber.isEmpty else { return nil }
        number = Self.format(rawNumber)
        let query = rest[split...]
        if let start = query.range(of: "body=")?.upperBound {
            let value = query[start...].prefix { $0 != "&" }
            body = value.removingPercentEncoding
        } else {
            body = nil
        }
    }

    var caption: String {
        if let body, !body.isEmpty { return "Text \(body) to \(number)" }
        return "Text \(number)"
    }

    /// +17796251378 becomes +1 779 625 1378. Other numbers are left as they are.
    private static func format(_ number: String) -> String {
        let digits = number.filter(\.isNumber)
        guard number.hasPrefix("+1"), digits.count == 11 else { return number }
        let local = Array(digits.dropFirst())
        return "+1 \(String(local[0..<3])) \(String(local[3..<6])) \(String(local[6...]))"
    }
}
