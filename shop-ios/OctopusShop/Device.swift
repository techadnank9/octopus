import Foundation

/// Values this phone remembers between launches.
enum Device {
    static let shopKey = "shopId"
    static let nameKey = "customerName"

    /// A random id created once. The backend uses it to recognise this customer.
    static let id: String = {
        let key = "device"
        if let saved = UserDefaults.standard.string(forKey: key) { return saved }
        let fresh = UUID().uuidString
        UserDefaults.standard.set(fresh, forKey: key)
        return fresh
    }()
}
