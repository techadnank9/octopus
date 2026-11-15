import CoreImage.CIFilterBuiltins
import SwiftUI

struct QRCodeView: View {
    let text: String

    var body: some View {
        if let image = Self.makeImage(from: text) {
            Image(uiImage: image)
                .interpolation(.none)
                .resizable()
                .scaledToFit()
                .accessibilityLabel("QR code for your shop number")
        }
    }

    private static func makeImage(from text: String) -> UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(text.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 12, y: 12)),
              let cgImage = CIContext().createCGImage(output, from: output.extent)
        else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
