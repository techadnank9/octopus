import UIKit

enum OwnerIdentity {
    private static let key = "ownerId"

    static var id: String {
        if let saved = UserDefaults.standard.string(forKey: key) { return saved }
        let fresh = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        UserDefaults.standard.set(fresh, forKey: key)
        return fresh
    }
}
