import SwiftUI

enum Theme {
    static let background = Color(red: 0xFA / 255, green: 0xF7 / 255, blue: 0xF2 / 255)
    static let ink = Color(red: 0x1B / 255, green: 0x12 / 255, blue: 0x30 / 255)
    static let purple = Color(red: 0x5B / 255, green: 0x2E / 255, blue: 0xE5 / 255)
    static let coral = Color(red: 0xFF / 255, green: 0x6B / 255, blue: 0x5E / 255)
    static let card = Color.white

    static let cardRadius: CGFloat = 20
    static let buttonHeight: CGFloat = 54

    static let largeTitle = Font.system(size: 34, weight: .heavy, design: .rounded)
    static let title = Font.system(size: 24, weight: .heavy, design: .rounded)
    static let headline = Font.system(size: 19, weight: .bold, design: .rounded)
    static let body = Font.system(size: 17, weight: .medium, design: .rounded)
    static let caption = Font.system(size: 14, weight: .semibold, design: .rounded)
}

struct PrimaryButtonStyle: ButtonStyle {
    var color: Color = Theme.purple

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: Theme.buttonHeight)
            .background(color, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}

extension View {
    func card() -> some View {
        padding(18)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.cardRadius, style: .continuous))
    }

    func screenBackground() -> some View {
        background(Theme.background.ignoresSafeArea())
    }
}
