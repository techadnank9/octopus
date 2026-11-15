import SwiftUI

@MainActor
final class ChatStore: ObservableObject {
    static let channelId = "demo:in-app"

    @Published private(set) var messages: [ChatMessage] = []
    @Published private(set) var isSending = false
    @Published var errorMessage: String?

    private let shopId: String
    private var task: Task<Void, Never>?

    init(shopId: String) {
        self.shopId = shopId
        let thread = ConvexService.shared.chatThread(shopId: shopId, channelId: Self.channelId).values
        task = Task { [weak self] in
            do {
                for try await messages in thread {
                    self?.messages = messages
                }
            } catch {
                self?.errorMessage = error.localizedDescription
            }
        }
    }

    deinit {
        task?.cancel()
    }

    func send(_ text: String) async {
        isSending = true
        errorMessage = nil
        do {
            try await ConvexService.shared.sendChat(shopId: shopId, channelId: Self.channelId, text: text)
        } catch {
            errorMessage = error.localizedDescription
        }
        isSending = false
    }
}
