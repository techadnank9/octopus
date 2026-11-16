import SwiftUI

struct BookView: View {
    let shopId: String
    @AppStorage(Device.nameKey) private var name = ""
    @State private var service = ""
    @State private var when = ""
    @State private var isBooking = false
    @State private var confirmation: String?
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Book a time")
                    .font(Theme.largeTitle)
                if let confirmation {
                    Text(confirmation)
                        .font(Theme.headline)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .card()
                }
                FormField(title: "Your name", text: $name)
                    .textContentType(.givenName)
                FormField(title: "What for", text: $service)
                FormField(title: "When", text: $when)
                if let errorMessage {
                    Text(errorMessage)
                        .font(Theme.caption)
                        .foregroundStyle(Theme.coral)
                }
                Button(isBooking ? "Booking…" : "Book it", action: book)
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(isBooking || !isComplete)
                    .opacity(isComplete ? 1 : 0.5)
            }
            .foregroundStyle(Theme.ink)
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .screenBackground()
    }

    private var isComplete: Bool {
        [name, service, when].allSatisfy { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
    }

    private func book() {
        let (bookedService, bookedWhen) = (trimmed(service), trimmed(when))
        isBooking = true
        errorMessage = nil
        Task {
            do {
                try await ConvexService.shared.book(
                    shopId: shopId, name: trimmed(name), service: bookedService, when: bookedWhen)
                confirmation = "Booked: \(bookedService), \(bookedWhen). We will remind you."
                service = ""
                when = ""
            } catch {
                errorMessage = error.plainMessage
            }
            isBooking = false
        }
    }

    private func trimmed(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
