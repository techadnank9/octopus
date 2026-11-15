import PhotosUI
import SwiftUI

struct MenuView: View {
    @StateObject private var store: MenuStore

    @State private var pickedPhoto: PhotosPickerItem?
    @State private var showCamera = false
    @State private var draft: ItemDraft?

    init(shopId: String) {
        _store = StateObject(wrappedValue: MenuStore(shopId: shopId))
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if store.isReading {
                        HStack(spacing: 12) {
                            ProgressView()
                            Text("Reading your menu")
                                .font(Theme.headline)
                        }
                        .frame(maxWidth: .infinity, minHeight: Theme.buttonHeight)
                    } else {
                        photoButtons
                    }
                    if let message = store.errorMessage {
                        Text(message)
                            .font(Theme.caption)
                            .foregroundStyle(Theme.coral)
                    }
                }
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)

                Section("Your menu") {
                    ForEach(store.items) { item in
                        ItemRow(item: item, store: store) { draft = ItemDraft(item: item) }
                    }
                    .onDelete { offsets in
                        let removed = offsets.map { store.items[$0] }
                        Task { for item in removed { await store.remove(item) } }
                    }
                    Button { draft = ItemDraft() } label: {
                        Label("Add item", systemImage: "plus")
                            .font(Theme.headline)
                            .foregroundStyle(Theme.purple)
                            .frame(minHeight: 44)
                    }
                }
            }
            .foregroundStyle(Theme.ink)
            .scrollContentBackground(.hidden)
            .screenBackground()
            .navigationTitle("Menu")
            .sheet(item: $draft) { draft in
                ItemEditorView(draft: draft) { name, priceCents in
                    Task { await store.save(id: draft.itemId, name: name, priceCents: priceCents) }
                }
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraPicker { image in read(image) }
                    .ignoresSafeArea()
            }
            .onChange(of: pickedPhoto) { _, photo in
                guard let photo else { return }
                pickedPhoto = nil
                Task {
                    if let data = try? await photo.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        read(image)
                    } else {
                        store.errorMessage = "We could not open that photo. Try another one."
                    }
                }
            }
        }
    }

    private var photoButtons: some View {
        VStack(spacing: 12) {
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                Button("Take a photo of your menu") { showCamera = true }
                    .buttonStyle(PrimaryButtonStyle())
            }
            PhotosPicker(selection: $pickedPhoto, matching: .images) {
                Text("Choose a photo")
                    .font(Theme.headline)
                    .foregroundStyle(Theme.purple)
                    .frame(maxWidth: .infinity, minHeight: Theme.buttonHeight)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        }
        .buttonStyle(.borderless)
    }

    private func read(_ image: UIImage) {
        store.errorMessage = nil
        Task { await store.readMenu(from: image) }
    }
}
