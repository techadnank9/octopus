import SwiftUI

struct ChatView: View {
    let shopId: String

    @State private var mode = ChatMode.owner

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Who is texting", selection: $mode) {
                    ForEach(ChatMode.allCases) { mode in
                        Text(mode.title).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                ChatThreadView(shopId: shopId, mode: mode)
                    .id(mode)
            }
            .screenBackground()
            .navigationTitle("Octopus")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
