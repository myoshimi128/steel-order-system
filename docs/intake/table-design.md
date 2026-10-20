# 受付〜受注登録 テーブル設計書

前提: `docs/intake/basic-design.md` / `docs/intake/screen-design.md`。受付のテーブル・関数・トリガー・ビュー・RLS・Realtime・Storage は `supabase/migrations/20261018100000`〜`20261018100600` の 7 ファイル（PR 3）。社員No. の一意制約とユーザー作成時のトリガーは `20261019100000_employee_no_login.sql`（PR 4）。納期連絡の公開の関数は `20261019110000_create_publish_lead_times.sql`（PR 4b）。受付待ち一覧・受付登録の関数は `20261020100000_create_intake_registration_functions.sql`（PR 5）。振り分けの列と関数は `20261021100000_add_split_file_functions.sql`（PR 6）。まだマイグレーションにしていない分（`orders` の変更と受注No. の切り替え）の下書きは `docs/intake/schema-draft.sql` に残し、PR 9 でマイグレーションにしたら削除する。確認・デモ用のサンプルデータは seed 006（`supabase/seed/006_demo_data.sql`）。

本体のテーブル（`orders` `users` など）の変更は、本体の `docs/table-design.md` にも反映している。

## 全体像

```
sites（営業所）
  │
intakes（受付）──1:N── intake_destinations（入れ先・複数）
  │  ├─1:N── intake_site_changes（加工場所の変更履歴）
  │  ├─1:N── intake_files（注文書 PDF・元データ・振り分け済み DXF・追加分・CSV）
  │  └─1:N── work_units（加工区分：先寸／アイトレ）──1:N── orders（受注：枝番）
  │                                   └─1:N── intake_files
  └─ 新規追加で notifications（通知）── notification_reads（既読）

private.intake_no_counters（受付No. の年ごとのカウンター）
lead_time_items / lead_time_messages / lead_time_history（目安納期）
```

| テーブル | 種類 | 内容 |
| --- | --- | --- |
| `sites` | 作成済み | 営業所（本社／A営業所／B営業所）。加工場所とユーザーの所属に使う。受注登録画面の作り直しの PR で前倒しして作成した |
| `intakes` | 新規 | 受付。メール・FAX・口頭の 1 件 |
| `intake_destinations` | 新規 | 受付の入れ先（複数・順序つき） |
| `private.intake_no_counters` | 新規 | 受付No. の採番 |
| `intake_site_changes` | 新規 | 加工場所の変更履歴 |
| `work_units` | 新規 | 加工区分（先寸／アイトレ）。受注登録待ち・CAD の 1 行 |
| `intake_files` | 新規 | ファイルの情報（実体は Storage）。受注に関わるファイルはすべてここに持つ |
| `notifications` / `notification_reads` | 新規 | 新着の通知と既読 |
| `lead_time_items` / `lead_time_messages` / `lead_time_history` | 新規 | 目安納期・部署メッセージ・更新履歴 |
| `orders` | **既存を変更（PR 9）** | 受付との紐付け・担当者を追加。受注No. の形式を変更（部材区分・加工場所は受注登録画面の作り直しの PR で先に追加済み）。受付のない今の受注登録画面から登録できなくならないよう、受付をつなぐ PR 9 で行う |
| `users` | **既存を変更** | 部署・営業所を追加（PR 3）。社員No. を一意・必須に（ログインを切り替える PR 4） |
| `attachments` | **既存を廃止（PR 9 以降）** | `intake_files` に一本化する。参照しているコードを外したあとで drop する |
| `work_unit_queue_view` | 新規ビュー | 受注登録待ち・CAD の一覧用 |

コード値は enum ではなく `text`＋`check` 制約で持つ（本体と同じ）。

## コード値と状態

### 受付（`intakes.status`）

| status | 表示 | 受付No. |
| --- | --- | --- |
| `waiting` | 受付待ち | なし |
| `registered` | 受付登録済（振り分け待ち） | 採番済 |
| `dispatched` | 振り分け完了 | 採番済 |
| `closed` | 完了（すべての加工区分の起票完了） | 採番済 |
| `estimate` | 見積・ミルシート | 採番する |
| `excluded` | 対象外 | なし |

```
waiting ──受付登録──→ registered ──振り分け完了──→ dispatched ──全区分の起票完了──→ closed
   │                                                   ↑
   ├──見積・ミルシート──→ estimate                       └ 「受注登録待ちに追加」で加工区分が増えたら closed→dispatched に戻る
   └──対象外──→ excluded ──元に戻す──→ waiting
```

受付の「2 削除」（受付登録の処理区分）は状態ではなく、`deleted_at` に日時を入れる論理削除とする。受注が 1 件でもある受付は削除できない。

状態を変える関数：受付登録・変更は `save_intake`、見積・ミルシート／対象外への区分と対象外から受付待ちへ戻すのは `classify_intake`（見積・ミルシートは受付No. を採番する）、削除は `delete_intake`（「関数」の表）。

| channel | 表示 |
| --- | --- |
| `mail` | メール |
| `fax` | FAX |
| `verbal` | 口頭・電話 |
| `visit` | 来社 |
| `other` | その他 |

### 加工区分（`work_units`）

| kind | status の流れ |
| --- | --- |
| `sakisun` 先寸 | `ready`（受注登録待ち）→ `done`（起票完了） |
| `aitore` アイトレ | `cad_waiting`（CAD 作業待ち）→ `cad_working`（作業中）→ `ready`（CSV 登録済・受注登録待ち）→ `done` |

| origin | 表示 | 作られ方 |
| --- | --- | --- |
| `split` | （表示なし） | 振り分け完了で自動作成 |
| `oversight` | 見落とし追加 | 受注登録待ちに追加（S-06b） |
| `verbal` | 口頭 | 受注登録待ちに追加（S-06b）。口頭の新規の注文は受付から通すので `split` |
| `other` | その他 | 受注登録待ちに追加（S-06b） |

- 1 つの受付に、同じ kind の加工区分が複数あってよい（見落とし追加など）
- `ready` → `done` は「この区分の起票を完了」（S-06d）で行う。1 つの加工区分から複数の受注（枝番）を登録できるため、自動では done にしない

### その他のコード

| 項目 | 値 |
| --- | --- |
| 部材区分 `orders.member_class` | `NONE`（無分類）/ `DF` / `GPL` / `BH` / `SPL`。画面の番号は 0 / 1 / 2 / 3 / 4（アプリの定数）。`SPL` はスプライス専用の受注 |
| 部署 `users.department` / `notifications.dept` / `lead_time_*.dept` | `sales` 営業部 / `processing` 加工部 / `shearing` シャーリング部 / `delivery` 配送部 / `general` 経理・総務 |
| 混雑度 `congestion` | `normal` 通常 / `busy` やや混雑 / `crowded` 混雑 / `consult` 要相談（要相談は日数を「—」表示） |
| ファイルの種類 `intake_files.kind` | `order_pdf` 注文書 / `original` 元データ / `split` 振り分け済み / `added` 追加分 / `csv` CAD の CSV / `other` |

### 番号

- **受付No.**：`YY-NNNN`。受付登録（または見積・ミルシートに区分）した時点で `private.assign_intake_no()` で採番する。年は日本時間の採番日。10000 以上は桁を増やす。再利用しない
- **受注No.**：`{受付No.}-{枝番}`（`26-1003-1`）。受注を保存するとき、`create_order` の中で `private.issue_order_branch()` が枝番を採番する（受付ごとの連番、同時実行でも重複しない）。本体の `orders.order_no` に保存する
- 採番のカウンターと関数は、本体の受注番号と同じく Data API で公開しない `private` スキーマに置く。ブラウザから直接呼ばれて番号が飛ぶことを防ぐためである

## テーブル定義

### sites（営業所）

| 列 | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| id | uuid | × | 主キー |
| number | integer | × | 画面の番号（1 本社 / 2 A営業所 / 3 B営業所）。一意 |
| code | text | × | 一意（`honsha` / `a` / `b`） |
| name | text | × | 表示名 |
| is_active | boolean | × | 使用中 |

番号の並びがそのまま表示順になるため、表示順の列は持たない（スタンプと同じ考え方）。

### intakes（受付）

| 列 | 型 | NULL | 初期値 | 説明 |
| --- | --- | --- | --- | --- |
| id | uuid | × | | 主キー。ファイルはこの ID で紐付ける |
| intake_no | text | ○ | | 受付No.（`26-1003`）。一意。受付登録で採番 |
| intake_year / intake_seq | smallint / integer | ○ | | 採番した年・連番（組で一意） |
| last_branch | integer | × | 0 | 受注No. の枝番のカウンター |
| channel | text | × | | `mail` `fax` `verbal` `visit` `other` |
| received_at | timestamptz | × | now() | 受信・受付の日時（メールが届いた日時、手動追加では入力した日時） |
| status | text | × | `waiting` | 上記の状態 |
| intake_date | date | ○ | | 受付日（受注情報の「日付」）。画面の初期値は今日 |
| staff_id | uuid | ○ | | 担当者（自社）。FK → `users`。画面の初期値はログイン中のユーザー |
| customer_id | uuid | ○ | | 売り先。FK → `customers`。受付登録で必須 |
| customer_contact | text | ○ | | 客先担当 |
| project_name | text | ○ | | 工事名 |
| due_date_type | text | ○ | | 納期種別。`確定` / `仮納期` / `後報` / `最短出荷`（`orders` と同じ）。画面の初期値は `後報` |
| due_date | date | ○ | | 納期（代表の納期）。`確定` `仮納期` のときだけ入る |
| delivery_method_id | uuid | ○ | | 配達。FK → `delivery_methods`。画面の初期値は「0 宵積み」 |
| delivery_method_note | text | ○ | | 配達がフリーのときの文字 |
| is_urgent | boolean | × | false | 至急 |
| site_id | uuid | ○ | | 加工場所。FK → `sites`。画面の初期値はログイン中のユーザーの営業所 |
| site_change_reason_input | text | ○ | | 加工場所を変えるときに同じ update で理由を送る欄。トリガーが履歴に移して空にする |
| memo | text | ○ | | メモ（口頭の注文の内容など） |
| registered_by / registered_at | uuid / timestamptz | ○ | | 「受付登録」を押した人・日時（記録用。担当者とは別に変更できない値として残す） |
| handling_by / handling_at | uuid / timestamptz | ○ | | 対応中の人・開始日時（30 分で無効とみなす） |
| email_from / email_subject / email_body | text | ○ | | Phase 2 |
| email_message_id | text | ○ | | Phase 2。一意（重複取り込みの防止） |
| deleted_at | timestamptz | ○ | | 論理削除（受付登録の「2 削除」） |
| created_by / updated_by / created_at / updated_at | | | | |

受付待ち（`waiting`）の行は、メールの取り込みや手動の追加で作られるため、受注情報の列はまだ空である。受注情報の列は受付登録の画面で入れる。

**制約**

- 受付No.・年・連番はそろって入るか、そろって空
- `waiting` と `excluded` 以外は受付No. が必須
- `registered` `dispatched` `closed` は売り先・加工場所が必須（受付登録の関数でも確認する。加工場所は画面で必ず初期値が入る）
- 納期：`確定` `仮納期` は日付が必須、`後報` `最短出荷` は日付が空（`orders` と同じ）
- 受注が 1 件でもある受付には `deleted_at` を入れられない（トリガー）

**トリガー**：`intakes_touch`（更新者・日時）、`intakes_log_site_change`（加工場所の変更履歴）、`intakes_notify_new`（`waiting` で追加されたらシャーリング部への通知を作る）、`intakes_prevent_deleting_ordered`（受注のある受付の削除を拒否。`orders.intake_id` を足す PR 9 で作る）

受付の納期・入れ先などは、受注の **初期値** として使う。受注登録で値を変えても、受付の値は書き換えない（加工場所だけは例外で、受注情報で変えると受付も更新する。basic-design.md「例外の運用」）。

### intake_destinations（受付の入れ先）

| 列 | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| intake_id | uuid | × | 受付（受付を消すと一緒に消える） |
| seq | smallint | × | 表示順。`(intake_id, seq)` で一意 |
| destination_id | uuid | ○ | FK → `delivery_destinations`。**NULL は「0 売り先と同じ」** |

- 「売り先と同じ」（NULL）の行は 1 つの受付に 1 行まで、同じ納入先も 1 つの受付に 1 行まで（部分一意インデックス）
- 画面で並びを変えたら、行を消して入れ直す（このテーブルだけ削除を許可する）

### private.intake_no_counters

`year`（主キー）・`last_seq`。`private.assign_intake_no()` からだけ使う。RLS を有効にしてポリシーを作らず、`anon`・`authenticated` の権限も外す（本体の `private.order_no_counters` と同じ）。

### intake_site_changes（加工場所の変更履歴）

`intake_id`・`from_site_id`・`to_site_id`・`reason`・`changed_by`・`changed_at`。アプリから直接 insert しない（トリガーが作る）。

### work_units（加工区分）

| 列 | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| id | uuid | × | 主キー |
| intake_id | uuid | × | 受付 |
| kind | text | × | `sakisun` 先寸 / `aitore` アイトレ |
| origin | text | × | `split`（振り分け）/ `oversight`（見落とし追加）/ `verbal`（口頭）/ `other` |
| status | text | × | `cad_waiting` `cad_working` `ready` `done`。**insert 時に省略すると先寸＝ready、アイトレ＝cad_waiting** |
| cad_assignee / cad_started_at | uuid / timestamptz | ○ | CAD の担当・作業開始（`cad_working` にするとトリガーが記録） |
| ready_at | timestamptz | ○ | 受注登録待ちに入った日時 |
| done_at | timestamptz | ○ | 起票完了の日時 |
| note | text | ○ | メモ（追加の理由の詳細など） |

**制約**：先寸は `ready`/`done` のみ／`(id, intake_id)` 一意（ファイルからの参照用）

**トリガー**：状態に応じて日時を自動で記録、`done` から戻すのを禁止、すべて `done` になったら受付を `closed` にする

### intake_files（ファイル）

| 列 | 型 | NULL | 説明 |
| --- | --- | --- | --- |
| id | uuid | × | 主キー。Storage のファイル名にも使う |
| intake_id | uuid | × | 受付 |
| work_unit_id | uuid | ○ | 加工区分（振り分け完了後・追加分・CSV） |
| kind | text | × | `order_pdf` 注文書 / `original` 元データ / `split` 振り分け済み / `added` 追加分 / `csv` / `other` |
| slot | text | ○ | 振り分けの枠 `sakisun` / `aitore`（kind=`split` のとき必須） |
| storage_path | text | × | `{intake_id}/{id}.{拡張子}`。一意 |
| original_name | text | × | 元のファイル名 |
| mime_type / size_bytes | | ○ | |
| split_done | boolean | × | 元データの「分割して保存済」の印（既定 false。人がチェックする。kind=`original` の行だけで使う。PR 6） |
| deleted_at | timestamptz | ○ | 論理削除（元データは振り分け完了で入る） |
| uploaded_by / updated_by / created_at / updated_at | | | |

**制約**：`(work_unit_id, intake_id)` → `work_units(id, intake_id)`（別の受付の加工区分には付けられない）／振り分けの枠の中は同じ名前を 1 つだけ（`(intake_id, slot, original_name)` の部分一意）→ 同じ名前は **差し替え** で扱う（前の行を論理削除して新しい行を足す。`add_split_file()`）

**トリガー**：kind=`csv` が追加されたら、そのアイトレを `ready` にする

受注は必ず受付を通すため、受注の注文書・図面は「受注 → 加工区分（`orders.work_unit_id`）→ ファイル」または「受注 → 受付（`orders.intake_id`）→ ファイル」でたどる。本体の `attachments`（受注に直接付ける注文書）は使わない。

### notifications / notification_reads（通知）

| `notifications` の列 | 説明 |
| --- | --- |
| dept | 通知先の部署（`users.department` と同じ値。受付の新着は `shearing`） |
| kind | `intake_new` など |
| intake_id | 受付 |
| title / body | 表示する文（例：新しいメールが届きました／差出人・件名） |

`notification_reads`：`(notification_id, user_id)` が主キー・`read_at`。未読＝自分の部署の通知のうち、自分の既読の行がないもの。

### 目安納期

| テーブル | 主な列 |
| --- | --- |
| `lead_time_items` | dept（`processing` 加工部 / `shearing` シャーリング部）・name（工程）・sort_order・days（営業日。要相談なら空でよい）・congestion（`normal` `busy` `crowded` `consult`）・note（補足） |
| `lead_time_messages` | dept（主キー）・message・expires_on（表示期限） |
| `lead_time_history` | dept・summary（例：レーザー 3→2営業日、メッセージを更新）・changed_by・changed_at |

初期データ：加工部＝切断・穴あけ・プレス・DS・ショット・CT、シャーリング部＝レーザー・プラズマ。

書き込みは納期連絡の「ホームに公開」から、関数 `publish_lead_times` で 3 つのテーブルを 1 つの transaction で書く（関数の表）。工程の削除・非表示はできない（`lead_time_items` に削除の権限を付けていない）。工程の削除・非表示は、必要になったら追加する。確認・デモ用の値は seed 007（`supabase/seed/007_lead_time_demo.sql`）。

## 本体のテーブルの変更

詳しくは本体の `docs/table-design.md`（`orders` `users`）を参照。

### orders（PR 9）

受注に必須の列（受付・加工区分）を先に足すと、受付のない今の受注登録画面から登録できなくなる。そのため、テストデータの受注の削除・列の追加・受注No. の切り替え（`private.issue_order_branch()`、`private.next_order_no()` とカウンターの削除、`create_order` の変更）は、受注登録画面と受付をつなぐ PR 9 でまとめて行う（下書きは `schema-draft.sql`）。

| 列 | 型 | 説明 |
| --- | --- | --- |
| intake_id | uuid | 受付。NOT NULL（受注はすべて受付を通す） |
| work_unit_id | uuid | どの加工区分から起票したか。NOT NULL。`(work_unit_id, intake_id)` → `work_units(id, intake_id)` |
| branch_no | integer | 枝番。`(intake_id, branch_no)` で一意 |
| member_class | text | 部材区分。`NONE` `DF` `GPL` `BH` `SPL`。既定 `NONE`。**`SPL` がスプライス専用の受注**（`is_splice` は廃止）。受注登録画面の作り直しの PR で追加済み（このマイグレーションでは扱わない） |
| site_id | uuid | 加工場所（出荷待ちの振り分けに使う）。NOT NULL。受注登録画面の作り直しの PR で追加済み（このマイグレーションでは扱わない） |
| staff_id | uuid | 担当者（自社）。FK → `users`。画面の初期値はログイン中のユーザー。NOT NULL |
| order_no | text | 既存の列。`{受付No.}-{枝番}` を `create_order` の中で入れる。`private.next_order_no()` の初期値は外す |

受注の入れ先は既存の `delivery_destination_id`（NULL は売り先と同じ）を使う。納期（`due_date_type` / `due_date`）・配達・工事名なども既存の列に、受注ごとの値として保存する。

### users

| 列 | 型 | 説明 |
| --- | --- | --- |
| department | text | 部署。`sales` `processing` `shearing` `delivery` `general`。通知の宛先に使う |
| site_id | uuid | 所属する営業所。FK → `sites`。受付登録の加工場所の初期値・ヘッダーの表示（「本社シャーリング部」）に使う |
| employee_no | text | 既存の列。英大文字と数字で 1〜10 文字。一意・必須。ログインに使う（PR 4。ユーザー作成時のトリガーがメールアドレスから入れる） |

`department`・`site_id` はどちらも空を許す（既存のユーザーは空のまま入るため）。部署が空のユーザーには通知が届かない。ログイン中のユーザーの部署は `current_user_department()`（`security definer`。`current_user_role()` と同じ作り）で読み、通知の RLS に使う。

## 関数

| 関数 | 内容 |
| --- | --- |
| `private.assign_intake_no(intake_id) → text` | 受付No. を採番する（すでにあれば同じ番号を返す）。年ごとのカウンターを 1 行ロックして +1。`security definer`（カウンターは `authenticated` の権限を外しているため、`security invoker` の `register_intake` から呼んでも所有者の権限で読み書きする。受注番号の `private.next_order_no()` と同じ作り） |
| `register_intake(intake_id) → text` | 受付登録。売り先・加工場所をチェック → 採番 → `registered`・登録者を記録・対応中を解除 |
| `complete_split(intake_id, no_file_kinds text[]) → text[]` | 振り分け完了。枠ごとに加工区分を作ってファイルを紐付け、図面なしの区分（`array['sakisun']` など）も作る。元データを論理削除し、**Storage から消すパスを返す**。`dispatched` にする |
| `add_work_unit(intake_id, kind, origin, note) → uuid` | 受注登録待ちに追加（見落とし・口頭など）。振り分け完了後のみ。`closed` なら `dispatched` に戻す |
| `private.issue_order_branch(intake_id) → (branch_no, order_no)` | 受注No. の枝番を採番する。`create_order` の中からだけ呼ぶ。`security definer`（PR 9） |
| `complete_work_unit(work_unit_id)` | 起票完了（`ready` → `done`） |
| `save_intake(intake_id, info jsonb, destinations jsonb, register boolean)` → text | 受付登録（処理区分 0 新規）と変更（1 変更）（PR 5）。受注情報の列を書き、入れ先を消して入れ直し（`destinations` は納入先の id か null＝売り先と同じの配列。並び順で `seq`）、`register = true` なら続けて `register_intake` で採番する。1 つの transaction で行い、受付No. を返す。新規は受付待ちだけ（違えば `INTAKE_NOT_WAITING` のエラー＝ほかの人が先に登録した）、変更は受付登録済・振り分け完了・完了だけ。事務・管理者だけ（関数の中でもロールを確かめる） |
| `classify_intake(intake_id, status)` → text | 受付待ち → 見積・ミルシート（受付No. を採番して返す）／対象外、対象外 → 受付待ち（PR 5）。それ以外の移り方は `INTAKE_STATUS_CHANGED` のエラー。対応中の表示も外す |
| `delete_intake(intake_id)` | 処理区分 2 削除（PR 5）。`deleted_at` を入れる論理削除。受付登録済・振り分け完了・完了・見積の受付が対象（受付待ち・対象外は「対象外」で扱う）。受注のある受付の削除の禁止は PR 9 のトリガー |
| `claim_intake(intake_id)` → uuid | 対応中にする（PR 5）。受付待ちで、空き・自分・開始から 30 分過ぎのときだけ自分と今の日時を入れる。条件つきの update 1 回で決めるため、同時に開いても 1 人に決まる。その後の対応中の人を返す |
| `release_intake(intake_id)` | 対応中を外す（PR 5）。自分が対応中のときだけ |
| `add_split_file(intake_id, file_id, slot, original_name, storage_path, mime_type, size_bytes)` → text | 振り分けの枠にファイルの行を足す（PR 6）。実物は呼ぶ前に Storage に置く。同じ枠に同じ名前があれば、前の行を論理削除して差し替え、前の置き場所を返す（アプリが実物を消す）。論理削除と追加を 1 つの transaction で行う。受付登録済の受付だけ（違えば `SPLIT_NOT_REGISTERED` のエラー）。事務・管理者だけ |
| `remove_split_file(file_id)` → text | 振り分けの枠からファイルを外す（PR 6）。論理削除して置き場所を返す（アプリが実物を消す）。受付登録済の受付だけ |
| `set_original_split_done(file_id, done)` | 元データの「分割して保存済」の印を付け外しする（PR 6）。受付登録済の受付だけ |
| `publish_lead_times(dept, items jsonb, summary, message, expires_on, expected_history_id) → uuid` | 納期連絡の「ホームに公開」（PR 4b）。工程（`items` の並び順で `sort_order`。`id` が空の行は追加）・部署メッセージを書き換え、`lead_time_history` に要約を 1 行残して、その id を返す。事務・管理者だけ。部署メッセージの行をロックしてから、最新の履歴が `expected_history_id`（画面を開いた時点の最新）と違えば `LEAD_TIME_CONFLICT` のエラー（ほかの人が先に公開した）。既存の工程がすべて渡されていなければエラー（工程は削除できないため）。要相談の工程は日数を空にする。`message`・`expires_on`・`expected_history_id` は初期値 null（型の生成で省略できる引数になる） |
| `create_order(p_order, p_items)`（本体・変更。PR 9） | ヘッダーの JSON に `intake_id`・`work_unit_id`・`site_id`・`staff_id` を受け取る（`member_class` は受注登録画面の作り直しの PR で追加済み）。受注の insert の前に `private.issue_order_branch()` で受注No. を決める。加工場所が受付と違えば、受付の加工場所も更新する。すべて 1 つの transaction |

`private` の関数以外は `security invoker`（呼び出したユーザーの権限で実行）とし、RLS をそのまま効かせる。

## ビュー `work_unit_queue_view`

受注登録待ち（`status='ready'`）と CAD（`kind='aitore' and status in ('cad_waiting','cad_working')`）の一覧に使う。`security_invoker=true`。

列：work_unit_id・kind・origin・status・cad_assignee・cad_started_at・ready_at・intake_id・intake_no・customer_id・customer_name・project_name・due_date_type・due_date・is_urgent・site_id・staff_id・staff_name・registered_at・file_count

並び順はクエリ側：`is_urgent desc, due_date asc nulls last, registered_at asc`（screen-design.md「並び順」）

## RLS・権限・Realtime・Storage

本体のロール（`current_user_role()`）で制御する。

| テーブル | office（事務） | factory（現場） | admin（管理者） |
| --- | --- | --- | --- |
| `intakes` `intake_destinations` `intake_site_changes` `work_units` `intake_files` | 参照・登録・更新 | 参照不可 | すべて |
| `sites` | 参照 | 参照 | すべて |
| `notifications` | 参照（自分の部署の行だけ） | 参照（自分の部署の行だけ） | 参照（自分の部署の行だけ） |
| `notification_reads` | 自分の行の参照・登録 | 自分の行の参照・登録 | 自分の行の参照・登録 |
| `lead_time_items` `lead_time_messages` `lead_time_history` | 参照・登録・更新 | 参照 | すべて |

- 業務データは物理削除しない。`intake_destinations` だけ、事務・管理者の削除を許可する（入れ先の入れ直しのため）
- `intake_site_changes` はトリガーだけが書く（アプリからは参照のみ）
- `notifications` はトリガー（`security definer`）だけが書く
- 関数の実行権限は `authenticated` にだけ付与する（`public`・`anon` からは外す）
- テーブル・ビューの権限は、マイグレーションの中で `authenticated` にだけ、必要な操作の分を付ける（先に `anon`・`authenticated` の権限をすべて外してから付け直す）。Data API の設定画面から公開の操作をすると `anon` にも権限が付くことがあるため、画面では公開されているかを確認するだけにする
- Realtime：`notifications`・`intakes`・`work_units` を `supabase_realtime` に追加する（通知と一覧の自動更新）。Realtime の配信も RLS に従う
- Storage：非公開バケット `intake-files`（50MB、未決 Q-4）。事務・管理者は参照・追加・更新・削除（元データの削除と差し替えのため）
- Phase 2 のメール取り込み API はサービスロールキーで書き込む

新しいテーブルは、作成後に Data API の設定で公開されているかを確認する（権限はマイグレーションで付ける）。`private` スキーマのテーブル・関数は公開しない。

### マイグレーションの実行の手順（PR 3）

1. SQL Editor で、次の順に 1 ファイルずつ実行する
   1. `20261018100000_add_user_department_and_site.sql`（`users` の部署・営業所、`current_user_department()`）
   2. `20261018100100_create_intake_tables.sql`（受付・入れ先・変更履歴・受付No. のカウンター・加工区分・ファイルとトリガー）
   3. `20261018100200_create_intake_functions.sql`（採番・受付登録・振り分け完了・追加・起票完了）
   4. `20261018100300_create_notifications_and_lead_times.sql`（通知・目安納期と初期データ）
   5. `20261018100400_create_work_unit_queue_view.sql`
   6. `20261018100500_create_intake_rls_and_realtime.sql`（RLS・権限・Realtime）
   7. `20261018100600_create_intake_files_bucket.sql`（Storage。権限のエラーになったら、ファイルの先頭の手順で管理画面から作る）
2. 既存のユーザーに部署・営業所を入れる（1 のファイルの先頭の SQL）
3. `npm run db:types` で型を再生成する
4. Data API の設定画面で、次が公開されているかを **確認だけ** する（画面から公開の操作はしない。`anon` にも権限が付くことがあるため）
   - 公開するもの：`intakes`・`intake_destinations`・`intake_site_changes`・`work_units`・`intake_files`・`notifications`・`notification_reads`・`lead_time_items`・`lead_time_messages`・`lead_time_history`・`work_unit_queue_view`
   - 公開してはいけないもの：`private` スキーマ全体（`private.intake_no_counters`・`private.assign_intake_no`・既存の `private.order_no_counters`・`private.next_order_no`）。どのテーブルも `anon` に権限を付けない
5. 確認・デモ用に、必要なら seed 006 を実行する（本番の DB では実行しない）

### マイグレーションの実行の手順（PR 6）

1. SQL Editor で `20261021100000_add_split_file_functions.sql` を実行する
2. `npm run db:types` で型を再生成する（列と 3 つの関数の型は、生成と同じ形で `lib/database.types.ts` に先に入れてあるため、再生成しても差は出ない想定）
3. テーブルは増えないため、Data API の設定画面での確認は不要
4. 振り分けの結果（加工区分・ファイル・Storage の実物）は、seed 010（`supabase/seed/010_work_unit_check.sql`。読むだけの SQL）で確かめられる

### マイグレーションの実行の手順（PR 5）

1. SQL Editor で `20261020100000_create_intake_registration_functions.sql` を実行する
2. `npm run db:types` で型を再生成する（5 つの関数の型は、生成と同じ形で `lib/database.types.ts` に先に入れてあるため、再生成しても差は出ない想定）
3. テーブルは増えないため、Data API の設定画面での確認は不要
4. 確認・デモ用に、必要なら seed 009（本文つきの受付待ち。`supabase/seed/009_intake_mail_demo.sql`）を実行する（本番の DB では実行しない）

### マイグレーションの実行の手順（PR 4b）

1. SQL Editor で `20261019110000_create_publish_lead_times.sql` を実行する
2. `npm run db:types` で型を再生成する（`publish_lead_times` の型は、生成と同じ形で `lib/database.types.ts` に先に入れてあるため、再生成しても差は出ない想定）
3. テーブルは増えないため、Data API の設定画面での確認は不要
4. 確認・デモ用に、必要なら seed 007（目安納期のデモの値）・seed 008（通知の確認）を実行する（本番の DB では実行しない）

## ファイルの保存

- バケット `intake-files`（非公開）、パス `{intake_id}/{file_id}.{拡張子}`（日本語の名前はキーに使わない）
- アップロードの順番（PR 5 で決めた）：① ファイルの id を画面で決める → ② ブラウザから Storage に置く → ③ 置けたファイルの行（`intake_files`）をまとめて作る → ④ 行を作れなかったら、② で置いた実物を Storage から消す。先に行を作る順だと、置くのに失敗したときに行を消す必要があるが、`intake_files` には削除の権限を付けていない（業務データは物理削除しない）ため、この順にする（`lib/intake/upload-intake-files.ts`）
- ファイルはブラウザから Storage に直接置く（Server Action には送れる大きさの上限があるため、通さない）。置けるのは事務・管理者だけ（Storage のポリシー）。PDF には `application/pdf` の種類を付けて置き、署名付き URL を開いたときにブラウザの中で表示されるようにする
- 振り分けの枠の差し替え（PR 6 で決めた）：同じ枠に同じ `original_name` があれば、前の行を論理削除して新しい行を足し、前の実物を Storage から消す（`add_split_file()`）。上書きにしないのは、置き場所（ファイルの id）を毎回新しくして、行と実物の対応を 1 対 1 に保つため
- 元データを枠へドラッグしたとき：サーバーが Storage の中で元データを複製（`copy`）してから、枠の行を作る
- 元データの削除：`complete_split()` が削除するパスを返す → アプリが Storage から削除する（失敗した分を後でまとめて削除する仕組みは Phase 2）。元データは振り分け完了で消すため（置き場所を圧迫しないため）、まれに見返したいときは、受付のメール（会社のメールソフト）の添付から確認する

## 通知（DB 側）

- `intakes` に `waiting` の行が INSERT されたら、トリガーで `notifications`（dept=`shearing`、kind=`intake_new`）を作る
- 宛先の判定は `users.department`。受付の新着はシャーリング部の全員に届く

## Phase 2：メール自動取り込み（今回は受け皿のみ）

- 会社のメールソフトのルールで、すべての受信メールを受付用のアドレスへ **リダイレクト** → メール受信サービス → `app/api/intake/inbound-email/route.ts`
- 署名の検証 → `email_message_id` で重複チェック → `intakes`（status=`waiting`）を作る → 添付を `intake_files`（PDF=`order_pdf`、DXF・要変換のファイル=`original`）
- 書き込みはサービスロールキー（Vercel の環境変数）

## 主なクエリ例

```ts
// 受付待ち
supabase.from('intakes').select('id, channel, received_at, email_from, email_subject, handling_by, intake_files(kind, original_name)')
  .eq('status', 'waiting').is('deleted_at', null).order('received_at', { ascending: false })

// 受付登録（受注情報の保存・入れ先の入れ直し・受付No. の採番を 1 つの関数で行う。PR 5）
const { data: intakeNo } = await supabase.rpc('save_intake', {
  p_intake_id: id,
  p_info: { intake_date, staff_id, customer_id, customer_contact, project_name,
    due_date_type, due_date, delivery_method_id, delivery_method_note, is_urgent, site_id },
  p_destinations: [null, destinationId],  // null は売り先と同じ
  p_register: true,                       // 変更（処理区分 1）は false
})

// 振り分け完了（元データの実ファイルも削除）
const { data: paths } = await supabase.rpc('complete_split', { p_intake_id: id, p_no_file_kinds: [] })
if (paths?.length) await supabase.storage.from('intake-files').remove(paths)

// 受注登録待ち（本社のタブ）
supabase.from('work_unit_queue_view').select('*').eq('status', 'ready').eq('site_id', honshaId)
  .order('is_urgent', { ascending: false }).order('due_date', { ascending: true, nullsFirst: false }).order('registered_at')

// CAD
supabase.from('work_unit_queue_view').select('*').eq('kind', 'aitore').in('status', ['cad_waiting', 'cad_working'])
  .order('is_urgent', { ascending: false }).order('due_date', { ascending: true, nullsFirst: false })

// 受注の保存（枝番の採番は create_order の中で行う。クライアントから採番の関数は呼ばない）
const { data: orderNo } = await supabase.rpc('create_order', { p_order: { intake_id, work_unit_id, member_class, site_id, staff_id, ... }, p_items })

// 通知の購読（自分の部署）
supabase.channel('notify').on('postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'notifications', filter: `dept=eq.${department}` }, onNotify).subscribe()
```
