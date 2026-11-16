import SwiftUI

/// One customer conversation. The owner reads what the octopus said and can answer in person.
struct InboxThreadView: View {
    let row: InboxRow

    @StateObject private var store: InboxThreadStore
    @State private var draft = ""

    private static let bottom = "bottom"

    init(shopId: String, row: InboxRow) {
        self.row = row
        _store = StateObject(wrappedValue: InboxThreadStore(shopId: shopId, channelId: row.channelId))
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 10) {
                    ForEach(store.messages) { message in
                        ChatBubble(message: message, linkTitle: "Open link", inInbox: true)
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
            .onChange(of: store.errorMessage) { scrollToBottom(proxy) }
        }
        .safeAreaInset(edge: .bottom) {
            composer
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Theme.background)
        }
        .screenBackground()
        .navigationTitle(row.customer)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var composer: some View {
        HStack(spacing: 10) {
            TextField("Reply as yourself", text: $draft, axis: .vertical)
                .font(Theme.body)
                .lineLimit(1...4)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            Button("Send") { send() }
                .font(Theme.headline)
                .foregroundStyle(Theme.purple)
                .frame(minHeight: 44)
                .disabled(trimmedDraft.isEmpty || store.isSending)
        }
    }

    private var trimmedDraft: String {
        draft.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// The draft is kept when the reply fails, so the owner does not have to type it again.
    private func send() {
        let text = trimmedDraft
        Task {
            if await store.reply(text) && trimmedDraft == text { draft = "" }
        }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        withAnimation { proxy.scrollTo(Self.bottom, anchor: .bottom) }
    }
}
