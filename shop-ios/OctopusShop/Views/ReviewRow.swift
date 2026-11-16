import SwiftUI

/// A quick rating shown under an order that is ready.
struct ReviewRow: View {
    let shopId: String
    @State private var rating = 0
    @State private var text = ""
    @State private var isSending = false
    @State private var isSent = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if isSent {
                Text("Thank you. The shop will see this.")
                    .font(Theme.headline)
            } else {
                Text("How was it?")
                    .font(Theme.headline)
                stars
                HStack(spacing: 10) {
                    TextField("Add a comment (optional)", text: $text)
                        .font(Theme.body)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 44)
                        .background(Theme.background, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    Button(isSending ? "Sending…" : "Send", action: send)
                        .font(Theme.headline)
                        .foregroundStyle(Theme.purple)
                        .frame(minHeight: 44)
                        .disabled(rating == 0 || isSending)
                        .opacity(rating == 0 ? 0.4 : 1)
                }
                if let errorMessage {
                    Text(errorMessage)
                        .font(Theme.caption)
                        .foregroundStyle(Theme.coral)
                }
            }
        }
        .foregroundStyle(Theme.ink)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    private var stars: some View {
        HStack(spacing: 0) {
            ForEach(1...5, id: \.self) { star in
                Button { rating = star } label: {
                    Image(systemName: star <= rating ? "star.fill" : "star")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(Theme.purple)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(star == 1 ? "1 star" : "\(star) stars")
                .accessibilityAddTraits(star == rating ? .isSelected : [])
            }
        }
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
