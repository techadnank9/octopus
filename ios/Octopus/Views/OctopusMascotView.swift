import SwiftUI

/// Mascot area. Shows the bundled image for now; a USDZ model replaces it later.
struct OctopusMascotView: View {
    var height: CGFloat = 220

    var body: some View {
        Image("Octopus")
            .resizable()
            .scaledToFit()
            .frame(maxWidth: .infinity)
            .frame(height: height)
            .accessibilityLabel("Octopus mascot")
    }
}
