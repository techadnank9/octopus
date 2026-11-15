import SwiftUI

@MainActor
final class ChatStore: ObservableObject {
    @Published private(set) var messages: [ChatMessage] = []
    @Published private(set) var hasLoaded = false
    @Published private(set) var isSending = false
    @Published var errorMessage: String?

    let mode: ChatMode
    private let shopId: String
    private var task: Task<Void, Never>?

    init(shopId: String, mode: ChatMode) {
        self.shopId = shopId
        self.mode = mode
        let thread = ConvexService.shared.chatThread(shopId: shopId, channelId: mode.channelId).values
        task = Task { [weak self] in
            do {
                for try await messages in thread {
                    self?.messages = messages
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

    /// The reply arrives through the thread subscription.
    func send(_ text: String) async {
        isSending = true
        errorMessage = nil
        do {
            switch mode {
            case .owner:
                try await ConvexService.shared.sendOwner(shopId: shopId, text: text)
            case .customer:
                try await ConvexService.shared.sendChat(shopId: shopId, channelId: mode.channelId, text: text)
            }
        } catch {
            errorMessage = error.plainMessage
        }
        isSending = false
    }
}
