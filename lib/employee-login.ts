// 社員No. でのログインに使う純粋関数（docs/basic-design.md「ログイン」）。
//
// 画面では社員No. とパスワードでログインする。Supabase Auth はメールアドレスでログインする仕組みのため、
// 社員No. から決まった形のメールアドレス（{社員No. を小文字にしたもの}@staff.invalid）を作って渡す。
// .invalid は実在しないことが保証されたドメインで、メールは送らない。
//
// 社員No. からユーザーを調べる処理は作らない。作ると、どの社員No. が存在するかを外から確かめられてしまうため。
// ドメインを変えるときは、ユーザーの作成時のトリガー
// （supabase/migrations/20261019100000_employee_no_login.sql の handle_new_auth_user）も合わせて変える。

// ログイン用のメールアドレスのドメイン
export const LOGIN_EMAIL_DOMAIN = 'staff.invalid'

// 社員No. の形（英大文字と数字で 1〜10 文字。users_employee_no_format_check と同じ）
const EMPLOYEE_NO_PATTERN = /^[A-Z0-9]{1,10}$/

// 打った社員No. をそろえる。形に合わなければ null。
//   ・前後の空白を取る
//   ・全角の英数字を半角にする（normalize('NFKC') は「Ｕ００００１」を「U00001」にする）
//   ・小文字を大文字にする
export function normalizeEmployeeNo(input: string): string | null {
  const value = input.normalize('NFKC').trim().toUpperCase()
  return EMPLOYEE_NO_PATTERN.test(value) ? value : null
}

// 社員No. から、Supabase Auth に渡すメールアドレスを作る（U00001 → u00001@staff.invalid）
export function employeeNoToEmail(employeeNo: string): string {
  return `${employeeNo.toLowerCase()}@${LOGIN_EMAIL_DOMAIN}`
}
