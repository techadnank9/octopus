import ConvexMobile
import Foundation

extension Error {
    /// A sentence the customer can read. Backend messages written for people pass through.
    var plainMessage: String {
        if case .ConvexError(let data) = self as? ClientError,
           let message = try? JSONDecoder().decode(String.self, from: Data(data.utf8)) {
            return message
        }
        if self is URLError {
            return "We could not reach the internet. Check your connection and try again."
        }
        return "Something went wrong. Please try again."
    }
}
