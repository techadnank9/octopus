import SwiftUI

/// The "customer" role is this device; "agent" is the shop's octopus.
struct ChatBubble: View {
    let message: ChatMessage
    let linkTitle: String

    private var isSender: Bool { message.role == .customer }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(message.text)
            if let link = message.link, let url = URL(string: link) {
                Link(linkTitle, destination: url)
                    .fontWeight(.heavy)
                    .underline()
            }
        }
        .font(Theme.body)
        .foregroundStyle(isSender ? .white : Theme.ink)
        .tint(isSender ? .white : Theme.purple)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            isSender ? Theme.purple : Color(.systemGray5),
            in: RoundedRectangle(cornerRadius: 18, style: .continuous)
        )
        .frame(maxWidth: 300, alignment: isSender ? .trailing : .leading)
        .frame(maxWidth: .infinity, alignment: isSender ? .trailing : .leading)
    }
}
