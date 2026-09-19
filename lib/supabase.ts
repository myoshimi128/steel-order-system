// Supabaseのライブラリから、接続を作る関数を取り出す
// { } で囲むのは「名前付きインポート」。ライブラリの中の特定の機能だけを指定する書き方
import { createClient } from '@supabase/supabase-js'

// .env.local に書いた環境変数を読み込む
// process.env は Node.js が用意している環境変数の入れ物
// 末尾の ! は「この値は必ず存在する」とTypeScriptに伝える記号（Non-null assertion）
// これがないと「undefined かもしれない」と型エラーになる
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// URLとキーを渡して接続を作り、他のファイルから使えるように export する
// この supabase を通してデータベースを操作していく
export const supabase = createClient(supabaseUrl, supabaseKey)