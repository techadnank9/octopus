import SwiftUI

struct ArmTile: View {
    let kind: TileKind
    let value: String
    let caption: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(kind.rawValue)")
                .font(Theme.caption)
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Theme.purple, in: Circle())
            Text(kind.title)
                .font(Theme.headline)
                .lineLimit(2)
            Text(kind.line)
                .font(Theme.caption)
                .opacity(0.7)
                .lineLimit(3)
            Spacer(minLength: 4)
            Text(value)
                .font(Theme.largeTitle)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .contentTransition(.numericText())
                .animation(.default, value: value)
            Text(caption)
                .font(Theme.caption)
                .opacity(0.7)
        }
        .multilineTextAlignment(.leading)
        .foregroundStyle(Theme.ink)
        .frame(maxWidth: .infinity, minHeight: 210, alignment: .topLeading)
        .card()
        .accessibilityElement(children: .combine)
    }
}
