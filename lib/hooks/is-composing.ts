// 日本語入力（IME）で変換中かどうかを判定する。
//
// 担当者・工事名などは日本語で入力するため、変換を確定する Enter で
// 次の欄へ移ってしまわないよう、変換中の Enter は無視する必要がある。
// keyCode 229 は、一部のブラウザで変換中のキー入力に設定される値。
export function isComposing(event: { nativeEvent: KeyboardEvent }): boolean {
  return event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229
}
