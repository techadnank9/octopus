import Foundation

/// Who is texting in the Octopus tab: the owner giving instructions, or a demo customer.
enum ChatMode: String, CaseIterable, Identifiable {
    case owner, customer

    var id: Self { self }

    var title: String {
        switch self {
        case .owner: "You"
        case .customer: "Customer (demo)"
        }
    }

    var channelId: String {
        switch self {
        case .owner: "owner:in-app"
        case .customer: "demo:in-app"
        }
    }

    var hint: String {
        switch self {
        case .owner: "Tell your octopus what to do. It handles the rest."
        case .customer: "This is what your customer sees when they text your shop."
        }
    }

    var placeholder: String {
        switch self {
        case .owner: "Message your octopus"
        case .customer: "Text the shop"
        }
    }

    var waitingText: String {
        switch self {
        case .owner: "Working on it…"
        case .customer: "Typing…"
        }
    }

    var linkTitle: String {
        switch self {
        case .owner: "Open link"
        case .customer: "Pay now"
        }
    }

    var suggestions: [String] {
        switch self {
        case .owner:
            ["Add oat latte for $5.50", "Banana bread is sold out", "Accept the newest order",
             "How much did we make today?"]
        case .customer: []
        }
    }
}
