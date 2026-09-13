import SwiftUI

// 一鍵記錄便便。移植自 web/app/components/PoopForm.vue。
// 戶外單手操作，所以按鈕做大、選項一眼看完、不需要捲動。
struct PoopSheet: View {
    let onSubmit: (Consistency, PoopColor, String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var consistency: Consistency = .normal
    @State private var color: PoopColor = .brown
    @State private var note = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color.cream.ignoresSafeArea()

                VStack(alignment: .leading, spacing: 24) {
                    picker(title: "形狀", options: Consistency.allCases, selection: $consistency) {
                        ($0.label, $0.isAbnormal)
                    }
                    picker(title: "顏色", options: PoopColor.allCases, selection: $color) {
                        ($0.label, $0.isAbnormal)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("備註（選填）")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(Color.muted)
                        TextField("有什麼想記下來的嗎", text: $note, axis: .vertical)
                            .lineLimit(2...4)
                            .padding(14)
                            .background(Color.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    Spacer()

                    Button {
                        onSubmit(consistency, color, note.nilIfEmpty)
                        dismiss()
                    } label: {
                        Text("記錄")
                            .font(.title3.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 18)
                            .background(Color.poop)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                }
                .padding(20)
            }
            .navigationTitle("記錄便便")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }.foregroundStyle(Color.muted)
                }
            }
        }
    }

    /// 一列可橫向捲動的選項按鈕。異常選項用警示色標出來。
    private func picker<T: Hashable>(
        title: String,
        options: [T],
        selection: Binding<T>,
        meta: @escaping (T) -> (label: String, abnormal: Bool)
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Color.muted)
            HStack(spacing: 8) {
                ForEach(options, id: \.self) { option in
                    let info = meta(option)
                    let selected = selection.wrappedValue == option
                    Button {
                        selection.wrappedValue = option
                    } label: {
                        Text(info.label)
                            .font(.body.weight(.medium))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(background(selected: selected, abnormal: info.abnormal))
                            .foregroundStyle(foreground(selected: selected, abnormal: info.abnormal))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
        }
    }

    private func background(selected: Bool, abnormal: Bool) -> Color {
        guard selected else { return Color.surface }
        return abnormal ? Color.alertRed : Color.poop
    }

    private func foreground(selected: Bool, abnormal: Bool) -> Color {
        selected ? .white : Color.ink
    }
}

#Preview {
    PoopSheet { _, _, _ in }
}
