# 受付〜受注登録 テーブル設計書

前提: `docs/intake/basic-design.md` / `docs/intake/screen-design.md`。マイグレーションの下書きは `docs/intake/schema-draft.sql`（実装の PR で本物のマイグレーションにしたら削除する）。

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
| `orders` | **既存を変更** | 受付との紐付け・加工場所・担当者を追加。受注No. の形式を変更（部材区分の追加と `is_splice` の廃止は、受注登録画面の作り直しの PR で先に行う） |
| `users` | **既存を変更** | 部署・営業所を追加。社員No. を一意に |
| `attachments` | **既存を廃止** | `intake_files` に一本化する |
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

**トリガー**：`intakes_touch`（更新者・日時）、`intakes_log_site_change`（加工場所の変更履歴）、`intakes_notify_new`（`waiting` で追加されたらシャーリング部への通知を作る）、`intakes_prevent_deleting_ordered`（受注のある受付の削除を拒否）

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
| deleted_at | timestamptz | ○ | 論理削除（元データは振り分け完了で入る） |
| uploaded_by / updated_by / created_at / updated_at | | | |

**制約**：`(work_unit_id, intake_id)` → `work_units(id, intake_id)`（別の受付の加工区分には付けられない）／振り分けの枠の中は同じ名前を 1 つだけ（`(intake_id, slot, original_name)` の部分一意）→ 同じ名前は **差し替え（update）** で扱う

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

## 本体のテーブルの変更

詳しくは本体の `docs/table-design.md`（`orders` `users`）を参照。

### orders

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
| employee_no | text | 既存の列。一意にする。ログインに使う |

## 関数

| 関数 | 内容 |
| --- | --- |
| `private.assign_intake_no(intake_id) → text` | 受付No. を採番する（すでにあれば同じ番号を返す）。年ごとのカウンターを 1 行ロックして +1。`security definer` |
| `register_intake(intake_id) → text` | 受付登録。売り先・加工場所をチェック → 採番 → `registered`・登録者を記録・対応中を解除 |
| `complete_split(intake_id, no_file_kinds text[]) → text[]` | 振り分け完了。枠ごとに加工区分を作ってファイルを紐付け、図面なしの区分（`array['sakisun']` など）も作る。元データを論理削除し、**Storage から消すパスを返す**。`dispatched` にする |
| `add_work_unit(intake_id, kind, origin, note) → uuid` | 受注登録待ちに追加（見落とし・口頭など）。振り分け完了後のみ。`closed` なら `dispatched` に戻す |
| `private.issue_order_branch(intake_id) → (branch_no, order_no)` | 受注No. の枝番を採番する。`create_order` の中からだけ呼ぶ。`security definer` |
| `complete_work_unit(work_unit_id)` | 起票完了（`ready` → `done`） |
| `create_order(p_order, p_items)`（本体・変更） | ヘッダーの JSON に `intake_id`・`work_unit_id`・`site_id`・`staff_id` を受け取る（`member_class` は受注登録画面の作り直しの PR で追加済み）。受注の insert の前に `private.issue_order_branch()` で受注No. を決める。加工場所が受付と違えば、受付の加工場所も更新する。すべて 1 つの transaction |

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
- 関数の実行権限は `authenticated` にだけ付与する
- Realtime：`notifications`・`intakes`・`work_units` を `supabase_realtime` に追加する（通知と一覧の自動更新）。Realtime の配信も RLS に従う
- Storage：非公開バケット `intake-files`（50MB、未決 Q-4）。事務・管理者は参照・追加・更新・削除（元データの削除と差し替えのため）
- Phase 2 のメール取り込み API はサービスロールキーで書き込む

新しいテーブルは、作成後に Data API の設定で公開する（CLAUDE.md の運用）。`private` スキーマのテーブル・関数は公開しない。

## ファイルの保存

- バケット `intake-files`（非公開）、パス `{intake_id}/{file_id}.{拡張子}`（日本語の名前はキーに使わない）
- アップロードの順番：① `intake_files` の行を作る → ② Storage にアップロード → ③ 失敗したら行を削除する
- 振り分けの枠の差し替え：同じ枠に同じ `original_name` があれば、既存の行の Storage を上書きし、`updated_by` / `updated_at` を更新する
- 元データの削除：`complete_split()` が削除するパスを返す → アプリが Storage から削除する（失敗した分を後でまとめて削除する仕組みは Phase 2）

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

// 受付登録（受注情報を保存してから、受付No. を採番する）
await supabase.from('intakes').update({ intake_date, staff_id, customer_id, customer_contact, project_name,
  due_date_type, due_date, delivery_method_id, delivery_method_note, is_urgent, site_id }).eq('id', id)
// 入れ先は消して入れ直す → intake_destinations
const { data: intakeNo } = await supabase.rpc('register_intake', { p_intake_id: id })

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
