import SwiftUI

/// The "customer" role is whoever is texting: the customer, or the owner in owner mode.
/// In the inbox the owner reads the shop's side, so the sides swap and each shop reply says who wrote it.
struct ChatBubble: View {
    let message: ChatMessage
    let linkTitle: String
    var inInbox = false

    private var isCustomer: Bool { message.role == .customer }
    private var isTrailing: Bool { inInbox ? !isCustomer : isCustomer }
    private var isGrey: Bool { inInbox ? isCustomer : !isCustomer }
    private var isFromOwner: Bool { message.fromOwner == true }

    private var fill: Color {
        if isGrey { return Color(.systemGray5) }
        return inInbox && isFromOwner ? Theme.ink : Theme.purple
    }

    var body: some View {
        VStack(alignment: isTrailing ? .trailing : .leading, spacing: 4) {
            bubble
            if inInbox && !isCustomer {
                Text(isFromOwner ? "You" : "Octopus")
                    .font(Theme.caption)
                    .foregroundStyle(Theme.ink.opacity(0.6))
                    .padding(.horizontal, 6)
            }
        }
        .frame(maxWidth: .infinity, alignment: isTrailing ? .trailing : .leading)
    }

    private var bubble: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(message.text)
            if let link = message.link, let url = URL(string: link) {
                Link(linkTitle, destination: url)
                    .fontWeight(.heavy)
                    .underline()
            }
        }
        .font(Theme.body)
        .foregroundStyle(isGrey ? Theme.ink : .white)
        .tint(isGrey ? Theme.purple : .white)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(fill, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .frame(maxWidth: 300, alignment: isTrailing ? .trailing : .leading)
    }
}
