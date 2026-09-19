// 先ほど作った接続設定を読み込む
// @/ はプロジェクトのルートを指す記号（tsconfig.json で設定されている）
import { supabase } from '@/lib/supabase'

// Next.js のページコンポーネント
// async を付けると、サーバー側でデータ取得を待ってから画面を返せる
export default async function Home() {
  // 存在しないテーブルにアクセスして、接続が生きているか確認する
  // from() はテーブル名の指定、select() は取得する列の指定（* は全列）
  // await は「結果が返るまで待つ」という意味
  // { error } は返ってきた結果から error だけを取り出す書き方（分割代入）
  const { error } = await supabase.from('_test').select('*')

  // 画面に表示する内容を返す
  return (
    <div style={{ padding: 40 }}>
      <h1>接続確認</h1>
      {/* error があればその中身を、なければ成功を表示する（三項演算子） */}
      <p>{error ? `エラー: ${error.message}` : '接続成功'}</p>
    </div>
  )
}