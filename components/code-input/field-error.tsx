// 入力欄の下に出すエラーメッセージ。エラーがなければ何も表示しない。

type FieldErrorProps = {
  message?: string
}

export function FieldError({ message }: FieldErrorProps) {
  if (!message) {
    return null
  }
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{message}</p>
}
