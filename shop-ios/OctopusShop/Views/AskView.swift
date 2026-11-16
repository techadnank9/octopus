import SwiftUI

/// Chat with the shop's octopus.
struct AskView: View {
    @StateObject private var store: ChatStore
    @State private var draft = ""

    private static let bottom = "bottom"

    init(shopId: String) {
        _store = StateObject(wrappedValue: ChatStore(shopId: shopId))
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 10) {
                    Text("Ask about the menu, order by message, or say the usual.")
                        .font(Theme.caption)
                        .foregroundStyle(Theme.ink.opacity(0.6))
                        .multilineTextAlignment(.center)
                    ForEach(store.messages) { message in
                        ChatBubble(message: message, linkTitle: "Pay now")
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
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: store.messages) { scrollToBottom(proxy) }
            .onChange(of: store.isSending) { scrollToBottom(proxy) }
        }
        .safeAreaInset(edge: .bottom) {
            composer
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Theme.background)
        }
        .screenBackground()
    }

    private var composer: some View {
        HStack(spacing: 10) {
            TextField("Message the shop", text: $draft, axis: .vertical)
                .font(Theme.body)
                .lineLimit(1...4)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            Button("Send") {
                let text = trimmedDraft
                draft = ""
                Task { await store.send(text) }
            }
            .font(Theme.headline)
            .foregroundStyle(Theme.purple)
            .frame(minHeight: 50)
            .disabled(trimmedDraft.isEmpty || store.isSending || !store.isReady)
        }
    }

    private var trimmedDraft: String {
        draft.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation { proxy.scrollTo(Self.bottom, anchor: .bottom) }
    }
}
