import SwiftUI

@MainActor
final class ChatStore: ObservableObject {
    @Published private(set) var messages: [ChatMessage] = []
    @Published private(set) var isSending = false
    @Published var errorMessage: String?

    private let shopId: String
    private var channelId: String?
    private var task: Task<Void, Never>?

    init(shopId: String) {
        self.shopId = shopId
        task = Task { [weak self] in
            do {
                let channelId = try await ConvexService.shared.channel()
                self?.channelId = channelId
                let thread = ConvexService.shared.chatThread(shopId: shopId, channelId: channelId).values
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

    var isReady: Bool { channelId != nil }

    /// The reply arrives through the thread subscription.
    func send(_ text: String) async {
        guard let channelId else { return }
        isSending = true
        errorMessage = nil
        do {
            try await ConvexService.shared.sendChat(shopId: shopId, channelId: channelId, text: text)
        } catch {
            errorMessage = error.plainMessage
        }
        isSending = false
    }
}
