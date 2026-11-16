import SwiftUI

/// The live list of customer conversations.
@MainActor
final class InboxStore: ObservableObject {
    @Published private(set) var rows: [InboxRow] = []
    @Published private(set) var hasLoaded = false
    @Published private(set) var errorMessage: String?

    private var task: Task<Void, Never>?

    init(shopId: String) {
        let updates = ConvexService.shared.inbox(shopId: shopId).values
        task = Task { [weak self] in
            do {
                for try await rows in updates {
                    self?.rows = rows
                    self?.hasLoaded = true
                }
            } catch {
                self?.errorMessage = error.plainMessage
            }
        }
    }

    deinit {
        task?.cancel()
    }
}

/// One conversation, and the owner's own replies to it.
@MainActor
final class InboxThreadStore: ObservableObject {
    @Published private(set) var messages: [ChatMessage] = []
    @Published private(set) var isSending = false
    @Published var errorMessage: String?

    private let shopId: String
    private let channelId: String
    private var task: Task<Void, Never>?

    init(shopId: String, channelId: String) {
        self.shopId = shopId
        self.channelId = channelId
        let thread = ConvexService.shared.chatThread(shopId: shopId, channelId: channelId).values
        task = Task { [weak self] in
            do {
                for try await messages in thread {
                    self?.messages = messages
                }
            } catch {
                self?.errorMessage = error.plainMessage
            }
        }
    }

    deinit {
        task?.cancel()
    }

    /// The reply arrives through the thread subscription. Returns false when it could not be sent.
    func reply(_ text: String) async -> Bool {
        isSending = true
        errorMessage = nil
        defer { isSending = false }
        do {
            try await ConvexService.shared.replyInbox(shopId: shopId, channelId: channelId, text: text)
            return true
        } catch {
            errorMessage = error.plainMessage
            return false
        }
    }
}
