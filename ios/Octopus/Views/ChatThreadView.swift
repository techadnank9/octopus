import SwiftUI

struct ChatThreadView: View {
    @StateObject private var store: ChatStore
    @State private var draft = ""

    private static let bottom = "bottom"

    init(shopId: String, mode: ChatMode) {
        _store = StateObject(wrappedValue: ChatStore(shopId: shopId, mode: mode))
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 10) {
                    Text(store.mode.hint)
                        .font(Theme.caption)
                        .foregroundStyle(Theme.ink.opacity(0.6))
                        .multilineTextAlignment(.center)
                    ForEach(store.messages) { message in
                        ChatBubble(message: message, linkTitle: store.mode.linkTitle)
                    }
                    if store.isSending {
                        Text(store.mode.waitingText)
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
            VStack(spacing: 8) {
                if showsSuggestions { suggestions }
                composer
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Theme.background)
        }
    }

    private var showsSuggestions: Bool {
        store.hasLoaded && store.messages.isEmpty && !store.isSending
    }

    private var suggestions: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(store.mode.suggestions, id: \.self) { suggestion in
                Button(suggestion) { send(suggestion) }
                    .font(Theme.caption)
                    .foregroundStyle(Theme.purple)
                    .padding(.horizontal, 14)
                    .frame(minHeight: 44)
                    .background(Theme.card, in: Capsule())
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var composer: some View {
        HStack(spacing: 10) {
            TextField(store.mode.placeholder, text: $draft, axis: .vertical)
                .font(Theme.body)
                .lineLimit(1...4)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            Button("Send") {
                send(trimmedDraft)
                draft = ""
            }
            .font(Theme.headline)
            .foregroundStyle(Theme.purple)
            .disabled(trimmedDraft.isEmpty || store.isSending)
        }
    }

    private var trimmedDraft: String {
        draft.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func send(_ text: String) {
        Task { await store.send(text) }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation { proxy.scrollTo(Self.bottom, anchor: .bottom) }
    }
}
