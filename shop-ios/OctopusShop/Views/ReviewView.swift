import SwiftUI

struct ReviewView: View {
    let shopId: String
    @State private var rating = 5
    @State private var text = ""
    @State private var isSending = false
    @State private var isSent = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Leave a review")
                    .font(Theme.largeTitle)
                if isSent {
                    Text("Thank you. The shop will see this.")
                        .font(Theme.headline)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .card()
                } else {
                    stars
                    FormField(title: "What did you think?", text: $text, lines: 3...6)
                    if let errorMessage {
                        Text(errorMessage)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.coral)
                    }
                    Button(isSending ? "Sending…" : "Send review", action: send)
                        .buttonStyle(PrimaryButtonStyle())
                        .disabled(isSending)
                }
            }
            .foregroundStyle(Theme.ink)
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .screenBackground()
    }

    private var stars: some View {
        HStack(spacing: 4) {
            ForEach(1...5, id: \.self) { star in
                Button { rating = star } label: {
                    Image(systemName: star <= rating ? "star.fill" : "star")
                        .font(.system(size: 32, weight: .semibold))
                        .foregroundStyle(Theme.purple)
                        .frame(width: 50, height: 50)
                }
                .accessibilityLabel(star == 1 ? "1 star" : "\(star) stars")
                .accessibilityAddTraits(star == rating ? .isSelected : [])
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func send() {
        isSending = true
        errorMessage = nil
        Task {
            do {
                try await ConvexService.shared.review(
                    shopId: shopId, rating: rating, text: text.trimmingCharacters(in: .whitespacesAndNewlines))
                isSent = true
            } catch {
                errorMessage = error.plainMessage
            }
            isSending = false
        }
    }
}
