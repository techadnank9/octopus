import SwiftUI

/// A white rounded text field used on the checkout, booking and review forms.
struct FormField: View {
    let title: String
    @Binding var text: String
    var lines: ClosedRange<Int> = 1...1

    var body: some View {
        TextField(title, text: $text, axis: .vertical)
            .font(Theme.body)
            .lineLimit(lines)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .frame(minHeight: 50)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
