import SwiftUI

struct ChatView: View {
    @StateObject private var store: ChatStore
    @State private var draft = ""

    private static let bottom = "bottom"

    init(shopId: String) {
        _store = StateObject(wrappedValue: ChatStore(shopId: shopId))
    }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 10) {
                        Text("This is what your customer sees when they text your shop.")
                            .font(Theme.caption)
                            .foregroundStyle(Theme.ink.opacity(0.6))
                            .multilineTextAlignment(.center)
                        ForEach(store.messages) { message in
                            ChatBubble(message: message)
                        }
                        if store.isSending {
                            Text("Typing…")
                                .font(Theme.caption)
                                .foregroundStyle(Theme.ink.opacity(0.6))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        if let message = store.errorMessage {
                            Text(message)
                                .font(Theme.caption)
                                .foregroundStyle(Theme.coral)
                        }
                        Color.clear.frame(height: 1).id(Self.bottom)
                    }
                    .padding(16)
                }
                .onChange(of: store.messages) { scrollToBottom(proxy) }
                .onChange(of: store.isSending) { scrollToBottom(proxy) }
            }
            .safeAreaInset(edge: .bottom) { composer }
            .screenBackground()
            .navigationTitle("Customer chat (demo)")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var composer: some View {
        HStack(spacing: 10) {
            TextField("Text the shop", text: $draft, axis: .vertical)
                .font(Theme.body)
                .lineLimit(1...4)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            Button("Send", action: send)
                .font(Theme.headline)
                .foregroundStyle(Theme.purple)
                .disabled(trimmedDraft.isEmpty || store.isSending)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Theme.background)
    }

    private var trimmedDraft: String {
        draft.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func send() {
        let text = trimmedDraft
        draft = ""
        Task { await store.send(text) }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation { proxy.scrollTo(Self.bottom, anchor: .bottom) }
    }
}

private struct ChatBubble: View {
    let message: ChatMessage

    private var isCustomer: Bool { message.role == .customer }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(message.text)
            if let link = message.link, let url = URL(string: link) {
                Link("Pay now", destination: url)
                    .fontWeight(.heavy)
                    .underline()
            }
        }
        .font(Theme.body)
        .foregroundStyle(isCustomer ? .white : Theme.ink)
        .tint(isCustomer ? .white : Theme.purple)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            isCustomer ? Theme.purple : Color(.systemGray5),
            in: RoundedRectangle(cornerRadius: 18, style: .continuous)
        )
        .frame(maxWidth: 300, alignment: isCustomer ? .trailing : .leading)
        .frame(maxWidth: .infinity, alignment: isCustomer ? .trailing : .leading)
    }
}
