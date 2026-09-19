@AGENTS.md

# steel-order-system

製造業（鋼板切断部門）向けの受注管理システム。
紙伝票とExcelに分散した受注情報を一元化し、転記作業をなくすことを目的とする。

## 設計書

実装前に必ず該当する設計書を読むこと。

- `docs/basic-design.md` — スコープ、業務フロー、機能仕様、権限設計
- `docs/table-design.md` — テーブル定義、リレーション、制約、RLS方針
- `docs/screen-design.md` — 画面レイアウト、入力挙動

## 技術スタック

TypeScript / React / Next.js (App Router) / Supabase / Vercel

## 実装方針

- 権限制御はクライアント側の表示制御だけでなく、Supabase の RLS でも強制する
- 残数量・重量区分など計算で求められる値はカラムに保持しない
- 価格ルールはコードの条件分岐ではなく価格マスタのデータとして持つ
- 対象解像度は 1280×1024 固定。レスポンシブ対応は行わない

##