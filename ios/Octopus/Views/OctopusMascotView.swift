import SceneKit
import SwiftUI

/// Mascot area. Shows the bundled 3D model, or the flat image if the model cannot load.
struct OctopusMascotView: View {
    var height: CGFloat = 220

    @State private var scene: SCNScene?

    var body: some View {
        Group {
            if let scene {
                MascotSceneView(scene: scene)
            } else {
                Image("Octopus")
                    .resizable()
                    .scaledToFit()
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: height)
        .accessibilityElement()
        .accessibilityLabel("Octopus mascot")
        .onAppear {
            if scene == nil { scene = MascotScene.make() }
        }
    }
}

private struct MascotSceneView: UIViewRepresentable {
    let scene: SCNScene

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView()
        view.scene = scene
        view.backgroundColor = .clear
        view.autoenablesDefaultLighting = true
        view.allowsCameraControl = true
        view.antialiasingMode = .multisampling4X
        return view
    }

    func updateUIView(_ view: SCNView, context: Context) {}
}

private enum MascotScene {
    static func make() -> SCNScene? {
        guard let url = Bundle.main.url(forResource: "octopus", withExtension: "usdz"),
              let scene = try? SCNScene(url: url)
        else { return nil }
        scene.background.contents = UIColor.clear

        let model = SCNNode()
        scene.rootNode.childNodes.forEach(model.addChildNode)
        scene.rootNode.addChildNode(model)
        let (center, radius) = model.boundingSphere
        guard radius > 0 else { return nil }
        model.pivot = SCNMatrix4MakeTranslation(center.x, center.y, center.z)

        let camera = SCNNode()
        camera.camera = SCNCamera()
        camera.position = SCNVector3(0, 0, radius * 2.4)
        scene.rootNode.addChildNode(camera)

        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.intensity = 500
        scene.rootNode.addChildNode(ambient)

        if !UIAccessibility.isReduceMotionEnabled {
            let spin = SCNAction.rotateBy(x: 0, y: 2 * .pi, z: 0, duration: 16)
            let up = SCNAction.moveBy(x: 0, y: CGFloat(radius) * 0.06, z: 0, duration: 1.6)
            up.timingMode = .easeInEaseOut
            model.runAction(.repeatForever(spin))
            model.runAction(.repeatForever(.sequence([up, up.reversed()])))
        }
        return scene
    }
}
