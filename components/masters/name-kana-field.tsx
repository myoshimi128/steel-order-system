// マスタ管理画面の「ふりがな」入力欄（得意先・納入先で共通）。
// 受注登録画面の売り先・入れ先の一覧で、ふりがな・名前による検索に使う。
// ひらがな・カタカナのどちらで入力してもよい（検索時に区別しないため）。任意項目。

type NameKanaFieldProps = {
  defaultValue?: string | null
}

export function NameKanaField({ defaultValue }: NameKanaFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="name_kana" className="text-sm">
        ふりがな
      </label>
      <input
        id="name_kana"
        name="name_kana"
        type="text"
        defaultValue={defaultValue ?? ''}
        placeholder="受注登録画面の検索に使う（ひらがな・カタカナどちらでも可）"
        className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
      />
    </div>
  )
}
