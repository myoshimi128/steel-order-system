# テーブル設計書

## テーブル一覧

テーブルは性質によって 2 種類に分かれる。マスタは繰り返し参照される基準データ、トランザクションは日々発生する取引の記録である。

### マスタ系

| テーブル | 内容 |
| --- | --- |
| `customers` | 得意先 |
| `delivery_destinations` | 納入先 |
| `materials` | 材質。材質ラインの指示と表示色を含む |
| `products` | 商品（種類 × 材質 × 板厚 × 形状） |
| `plate_types` | 種類（普通板 / 縞板 / ボンデ / ミガキ） |
| `cutting_prices` | 切断単価 |
| `material_extras` | 材質エキストラ・高炉材加算（材質ごとに1行） |
| `thickness_extras` | 板厚エキストラ |
| `large_plate_extras` | 大板加算 |
| `standard_plate_prices` | 定尺単価 |
| `special_product_types` | 特殊製品種別（スプライス / ササラ / ベタ丸 / ドーナツ） |
| `special_product_prices` | 特殊製品単価 |
| `unit_weights` | 単位質量（縞板。メーカー × 板厚） |
| `process_types` | 加工種別 |
| `manufacturers` | メーカー |
| `notices` | 得意先の注意事項。得意先（必須）と、切断方法・加工種別（任意）の条件で表示する |
| `process_notices` | 加工の注意事項。加工種別（必須）と、板厚・穴径の範囲（任意）の条件で、加工の行の下に表示する |
| `stamps` | 現場用伝票に印字するスタンプ文言 |
| `customer_stamps` | 得意先ごとに既定でチェックするスタンプ |
| `users` | ユーザー。ロール・部署・営業所を含む |
| `delivery_methods` | 配達方法（宵積み / 2便 / 置場引取 など） |
| `sites` | 営業所（本社 / A営業所 / B営業所）。加工場所とユーザーの所属。番号（1〜3）で選ぶ。受注登録画面の作り直しで前倒しして作成（`supabase/migrations/20261017100100_create_sites_and_order_site.sql`）。列の説明は docs/intake/table-design.md |

### トランザクション系

| テーブル | 内容 |
| --- | --- |
| `orders` | 受注ヘッダー |
| `order_items` | 受注明細（材料） |
| `order_item_processes` | 加工明細（材料に紐づく加工） |
| `shipments` | 出荷実績 |
| `shipment_items` | 出荷明細 |
| `attachments` | 添付ファイル。**廃止**（`intake_files` に一本化。後述） |
| `order_stamps` | 受注に付けたスタンプ |

### 受付〜受注登録待ち

受付・振り分け・CAD・受注登録待ち・通知・目安納期のテーブルは、docs/intake/table-design.md に定義する。

| テーブル | 内容 |
| --- | --- |
| `intakes` | 受付（メール・FAX・口頭の 1 件）。受注情報の初期値を持つ |
| `intake_destinations` | 受付の入れ先（複数） |
| `intake_site_changes` | 加工場所の変更履歴 |
| `work_units` | 加工区分（先寸 / アイトレ）。受注登録待ち・CAD の 1 行 |
| `intake_files` | ファイル（注文書 PDF・DXF・CSV）。受注に関わるファイルはすべてここに持つ |
| `notifications` / `notification_reads` | 通知と既読 |
| `lead_time_items` / `lead_time_messages` / `lead_time_history` | 目安納期 |

### Phase2 で追加予定

`packages`（梱包）、`mill_sheets`（ミルシート）、`trading_companies`（商社）、`carriers`（運送会社）、`order_comments`（納期変更・注文変更のやり取り）

加工場所は `sites`（営業所）として MVP で追加した。

## マスタテーブル定義

### customers（得意先）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `code` | text | 得意先コード。数字 4 桁（例: 1001）。受注登録画面でテンキー入力し、4 桁打つと自動で次の欄へ進むため |
| `name` | text | 得意先名 |
| `name_kana` | text | 得意先名のふりがな。受注登録画面の売り先の検索に使う。ひらがな・カタカナのどちらでもよい。任意（NULL 可） |
| `sales_rep` | text | 自社側の営業担当者名 |
| `is_active` | boolean | 有効フラグ |
| `created_at` / `updated_at` | timestamptz |  |

客先側の窓口担当者（客先担当）は受注ごとに異なるため、得意先マスタではなく `orders.customer_contact` に持つ。

`name_kana`（ふりがな）は、漢字の名前を読み方で探せるようにするための列である。既存の行には値がないため NULL 可とし、マスタ画面から順次入力する。検索時にひらがな・カタカナの違いを区別しないため、どちらで登録してもよい（納入先も同じ）。追加は `supabase/migrations/20260930100100_add_name_kana_to_customers_and_destinations.sql`。

注意事項は `notices`（得意先の注意事項）テーブルに切り出す。得意先マスタ内のテキスト欄として持つと、その受注に関係のない注意事項まですべて表示され、件数が増えるにつれ読み飛ばされるためである。

### delivery\_destinations（納入先）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `code` | text | 納入先コード。数字 4 桁。受注登録画面でテンキー入力し、4 桁打つと自動で次の欄へ進むため。受注登録画面の「0 売り先と同じ」は 1 桁のため、4 桁のコードとは重ならない |
| `name` | text | 納入先名 |
| `name_kana` | text | 納入先名のふりがな。受注登録画面の入れ先の検索に使う。ひらがな・カタカナのどちらでもよい。任意（NULL 可） |
| `address` | text | 住所 |
| `area` | text | 持込地区 |
| `is_active` | boolean | 有効フラグ |

同一得意先でも案件ごとに納入先が変わるため、得意先とは独立したマスタとする。

### materials（材質）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `name` | text | 材質名（SS400、SN490B、SN490C など） |
| `line_mark` | text | 材質ラインの指示（青2本 など）。基本材質は NULL |
| `display_color` | text | 現場用伝票での表示色。基本材質は NULL |
| `has_dedicated_price` | boolean | 専用単価（`cutting_prices` に材質を指定した行）を持つか |
| `default_steel_making` | text | 製鋼法の初期値。`電炉材` / `高炉材`。既定 `電炉材` |
| `is_active` | boolean | 有効フラグ |

材質ラインは材質ごとに色と本数が決まっているため、マスタに登録して現場用伝票に印字する。「材質ライン要」とだけ印字するのではなく「材質ライン：青2本」のように具体的な指示を出すことで、現場が別途確認する手間をなくす。

基本材質（SS400）は `line_mark` と `display_color` を NULL とする。印刷処理では材質名を条件分岐せず、`line_mark` が登録されていれば印字するという判定のみを行う。材質が増えた場合もマスタに 1 行追加すれば対応できる。

`has_dedicated_price` は、切断単価の材質選択（マスタ管理画面のプルダウン）を「専用単価を持つ材質のみ」に絞り込むために使う。専用単価を持たない材質は SS400 ベースの単価に材質エキストラを加算して求めるため、プルダウンには出さない。

`name` に一意制約を設ける。

受注登録画面の番号入力のため、番号の列 `number`（integer、一意、NOT NULL）を持つ（後述「受注登録画面のための追加方針」を参照）。最も多く使う SS400 を「0（いつもの値＝初期値）」とし、明細の材質の初期値にする。ほかは 2 SM490A / 3 SM400A / 4 SN400B / 5 SN490C / 6 SN400C / 7 SN490B / 8 TMCP325C / 9 TMCP385C で、1 は空き番号（SS400 を 1 から 0 に変えたため）。

`default_steel_making`（製鋼法の初期値）は、受注明細で材質を選んだときに製鋼法の欄へ入れる値である。製鋼法は材質によって決まることが多いため（SS400 は電炉材、それ以外の規格材は高炉材）、材質ごとの値として持つ。明細ではそのあと手で変更できる（`supabase/migrations/20260930100500_material_default_values.sql`）。

### products（商品）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `plate_type_id` | uuid | FK → plate\_types |
| `material_id` | uuid | FK → `materials`。無規格（ボンデ・ミガキ）は NULL |
| `thickness` | numeric | 板厚（mm） |
| `shape` | text | 形状。`定尺` / `大板` |
| `is_active` | boolean | 有効フラグ |

メーカーは含めない。受注時点では使用する板のメーカーが確定しないためである（縞板のみ受注時に確定するが、これは受注明細側で保持する）。形状は定尺（5'x10'＝1524 × 3048）を超えるサイズを大板とするため、具体的な寸法は保持しない。ボンデ・ミガキは無規格のため `material_id` を NULL とする。

`plate_type_id` + `material_id` + `thickness` + `shape` に一意制約を設ける。

### plate\_types（種類）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `name` | text | 普通板 / 縞板 / ボンデ / ミガキ |
| `applies_material_extra` | boolean | 材質エキストラを適用するか（普通板のみ true） |
| `is_active` | boolean | 有効フラグ |

縞板・ボンデ・ミガキは種類固有の単価を持ち、材質エキストラを適用しない。ボンデ・ミガキは無規格のため材質を持たない。`applies_material_extra` が false の種類では、受注明細の製鋼法（`order_items.steel_making`）を指定しない（NULL）。

`name` に一意制約を設ける。

受注登録画面の番号入力のため、番号の列 `number`（integer、一意、NOT NULL）を持つ（0 普通板 / 1 縞板 / 2 ボンデ / 3 ミガキ）。

### cutting\_prices（切断単価）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `plate_type_id` | uuid | FK → `plate_types` |
| `material_id` | uuid | FK → `materials`。NULL は SS400 ベースの共通単価 |
| `thickness_min` / `thickness_max` | numeric | 板厚グループの範囲 |
| `cutting_method` | text | シャーリング / ガス / レーザー / プラズマ |
| `cutting_type` | text | 寸法切 / アイトレ |
| `unit_price` | numeric | kg 単価。NULL は都度見積もり（別途） |
| `valid_from` | date | 適用開始日 |
| `has_light_tier` | boolean | 1.5kg の段（1.5kg 未満は kg 単価 × 1.5）があるか。既定 false |
| `small_piece_quote_required` | boolean | 1 枚 2kg 未満は別途見積もりか。既定 false |

`has_light_tier` は普通板・SS400 ベース（`material_id` が NULL）のシャーリング・レーザーの行、`small_piece_quote_required` は普通板・SS400 ベースのガス・プラズマで 28mm 以上の行のみ true とする。最低保証重量の段や小物の扱いは単価の行ごとに異なるため、コードの条件分岐ではなく行のフラグとして持つ（計算ルールは basic-design.md「最低保証重量」を参照）。

板厚グループの区切りは種類と切断方法によって異なる（シャーは 1.6 / 2.3 / 3.2〜12、ガスは 12 / 14〜25 / 28〜50 …）。共通の区分を設けず、行として保持する。

25mm を超える板厚の単価は、単価表では板厚ごとに異なる値になっているが、その差分は板厚エキストラ（`thickness_extras`）として別に持つ。`cutting_prices` には板厚エキストラを差し引いたグループ単価を登録する（単価表の値をそのまま登録すると板厚エキストラが二重に加算されるため）。

`material_id` が NULL の行は SS400 ベースとして全材質で共有し、`material_extras.extra_price`（材質エキストラ）を加算する。`material_id` を指定した行は SN400C・SM400A・TMCP325C・TMCP385C など専用単価（`materials.has_dedicated_price` が true）を持つ材質に使用し、材質エキストラは加算しない。単価を引く際はまず材質指定の行を探し、なければ NULL の行を使う。

専用単価の行は、単価表の値（高炉材の価格）から高炉材加算の 10 を差し引いた電炉材ベースの値で登録する。SN400C・SM400A は切断方法によらず同一単価のため、その板厚で SS400 ベースに単価がある各切断方法に同額で登録する（TMCP325C・TMCP385C はガスのみ）。

`material_extras.blast_furnace_extra`（高炉材加算）は、材質エキストラとは別に、受注（`order_items.steel_making`）が高炉材の場合にどちらの行を使っても加算する。

### material\_extras（材質エキストラ）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `material_id` | uuid | FK → `materials` |
| `extra_price` | numeric | 材質エキストラ。SS400ベースの単価にこの材質を使う場合の加算 |
| `blast_furnace_extra` | numeric | 高炉材加算。受注が高炉材の場合の加算値（通常 +10、SS400 は 0） |

材質ごとに1行を持つ（`material_id` に一意制約）。高炉材加算は電炉材に +10 が基本だが、SS400 には適用しないなどの例外があるため、条件分岐をコードに書かず材質ごとの値として持つ。

専用単価（`materials.has_dedicated_price` が true）を持つ材質も、高炉材加算は共通で適用するため行を持つ（`extra_price` は使われないため 0、`blast_furnace_extra` は 10）。適用ルールは `cutting_prices` の説明を参照。

### thickness\_extras（板厚エキストラ）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `thickness` | numeric | 板厚 |
| `extra_price` | numeric | 加算値 |

25mm を超える板厚に適用する。扱う板厚が 28・32・36・40・45・50・55・60 と不規則な段階であるため、計算式ではなく板厚ごとの値を保持する。中間厚は外注のため保持しない。

初期値は 28:+1、32:+2、36:+3、40:+4、45:+5、50:+6、55:+7、60:+8（単価表の板厚ごとの単価差から求めた値）。

### large\_plate\_extras（大板加算）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `thickness` | numeric | 板厚 |
| `extra_price` | numeric | 加算値（3.2・4.5・6 は 30、9・12 は 15） |

板厚グループ単位ではなく個別の板厚で指定されるため、独立したテーブルとする。

### standard\_plate\_prices（定尺単価）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `plate_type_id` | uuid | FK → `plate_types` |
| `material_id` | uuid | FK → `materials`。無規格（ボンデ・ミガキ）は NULL |
| `thickness` | numeric | 板厚 |
| `plate_size` | text | 3x6 / 4x8 / 5x10 |
| `unit_price` | numeric | kg 単価 |
| `valid_from` | date | 適用開始日 |

定尺売りは切断を伴わないため、切断単価とは別に保持する。ボンデ・ミガキは板厚・サイズによらず一律のため、該当する組み合わせすべてに同じ単価を登録する。取得側で分岐させないための冗長である。

定尺売りの金額は「kg 単価 × 定尺 1 枚の重量 × 枚数」で求め、最低保証重量は適用しない（basic-design.md「定尺売りの単価」を参照）。

### special\_product\_types（特殊製品種別）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `name` | text | スプライス / ササラ / ベタ丸 / ドーナツ |
| `weight_basis` | text | 実重量 / 角重量 / 使用材重量（ササラは使用材重量、他は角重量） |
| `min_weight` | numeric | 最低保証重量（スプライスは 3、他は NULL） |
| `applies_thickness_extra` | boolean | 板厚エキストラを適用するか |
| `applies_large_plate_extra` | boolean | 大板加算を適用するか |
| `always_piece_price` | boolean | 常に枚単価で表示するか（ベタ丸・ドーナツ） |
| `has_light_tier` | boolean | 1.5kg の段があるか（ベタ丸・ドーナツのみ true）。既定 false |
| `irregular_cut_quote_required` | boolean | 切断区分がアイトレの場合に別途見積もりとするか（スプライスのみ true）。既定 false |
| `dimension_shape` | text | 受注明細の寸法の形。`角`（縦×横。スプライス・ササラ）/ `円`（直径。ベタ丸）/ `ドーナツ`（外径×内径）。既定 `角` |
| `is_active` | boolean | 有効フラグ |

`name` に一意制約を設ける。

受注登録画面のため、次の列を持つ（後述「受注登録画面のための追加方針」を参照）。

| カラム | 型 | 説明 |
| --- | --- | --- |
| `number` | integer | 番号（一意、NOT NULL）。受注登録画面の区分の番号として使う。区分の定数（1 寸法切 / 2 アイトレ / 3 定尺 / 9 加工）と重ならない値にする（チェック制約で 1・2・3・9 を禁止）。初期値は 4 スプライス / 5 ササラ / 7 ベタ丸 / 8 ドーナツ |
| `is_splice_order_type` | boolean | スプライス専用の受注で使う種別か（スプライスのみ true）。true の種別は通常の受注の区分の一覧に出さない。true の行は 1 行だけとする（部分一意インデックス） |

スプライス専用の受注の明細に使う種別を、種別名ではなく `is_splice_order_type` で特定する。種別名で分岐しない方針に合わせるためである。

`dimension_shape`（寸法の形）は、受注明細の寸法の入力欄を切り替えるために使う。既存の列（`weight_basis`・`always_piece_price` など）ではベタ丸とドーナツを区別できないため、種別名で分岐せずに済むよう寸法の形をデータとして持つ（`supabase/migrations/20260930100200_add_dimension_shape_to_special_product_types.sql`）。

### special\_product\_prices（特殊製品単価）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `special_product_type_id` | uuid | FK → `special_product_types` |
| `plate_type_id` | uuid | FK → `plate_types` |
| `has_shot` | boolean | ショット加工の有無（スプライスのみ使用。受注の `orders.splice_shot` で引き当てる） |
| `cutting_method` | text | 切断方法の条件。NULL は「切断方法を問わない」。値（`ガス` / `プラズマ` / `レーザー` など）が入っている行は、その切断方法の明細だけに使う |
| `thickness_min` / `thickness_max` | numeric | 板厚区分 |
| `unit_price` | numeric | kg 単価 |
| `valid_from` | date | 適用開始日 |

スプライスは切断・キリ孔・ショットを含むセット価格のため、切断方法によって単価が変わらない。ササラも切断方法によらず同じ単価を使う。

ベタ丸・ドーナツの単価はレーザーで切る場合のもので、ガス・プラズマで切る場合は別途見積もりとする（basic-design.md「特殊製品の単価」の「切断方法の条件」）。種別名で分岐せずにこれを表すため、切断方法の条件（`cutting_method`）を持たせる。

- ササラ・スプライスの行は `cutting_method` を NULL（切断方法を問わない）で登録する
- ベタ丸・ドーナツの行は `cutting_method` を `レーザー` で登録する。ガス・プラズマの明細には当てはまる行がないため、既存の「単価の行が登録されていない組み合わせは別途見積もり」の決まりで別途見積もりになる
- 価格マスタの行を取り出す関数（`get_pricing_rows`）は、明細の切断方法と一致する行と、`cutting_method` が NULL の行だけを返す。単価の計算（`lib/pricing`）は変えない
- 一意制約（同じ条件の行を 2 つ登録しない）に `cutting_method` を加える。NULL 同士も同じ条件とみなす（`nulls not distinct`）
- 既存の行のうち、ベタ丸・ドーナツの行はマイグレーションで `レーザー` にする

材質エキストラと高炉材加算はいずれにも適用する。

### unit\_weights（単位質量）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `plate_type_id` | uuid | FK → `plate_types` |
| `manufacturer_id` | uuid | FK → `manufacturers` |
| `thickness` | numeric | 板厚 |
| `unit_weight` | numeric | 単位質量（kg/m²） |
| `is_active` | boolean | 有効フラグ |

縞板の重量計算に使用する。単位質量はメーカーによって異なるため、メーカーごとに保持する。縞板は縞目の見た目が異なるため受注時に客先へメーカーを確認しており、受注時点で確定する。

### process\_types（加工種別）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `name` | text | 加工名（穴あけ、キリ孔、曲げ、開先、ショット、タップ孔、マーキング、ピアス孔、切り込みなど） |
| `category` | text | 集計用の区分（アイトレ、SPL など） |
| `input_shape` | text | 入力の形。`自由入力` / `穴` / `曲げ`。既定 `自由入力`。受注登録画面の加工の項目の入力欄を切り替える |
| `is_active` | boolean | 有効フラグ |

加工の注意事項は `process_notices` テーブルに切り出す。

`input_shape`（入力の形）は、加工の行の項目（`order_item_processes.spec_fields`）の入力欄と、数量の求め方を決める（basic-design.md「加工の入力項目」）。加工種別の名前で分岐せずに済むよう、データとして持つ（`special_product_types.dimension_shape` と同じ考え方）。初期データは、レーザー・プラズマ孔・ガス孔・キリ孔を `穴`、曲げを `曲げ`、それ以外を `自由入力` とする（列の追加は `supabase/migrations/20261002100000_add_process_input_shapes.sql`、値の設定は seed 005）。形を追加するたびに、チェック制約の値の一覧を新しいマイグレーションで広げる（予定: ピアス孔・長孔・中抜き・タップ孔・開先・マーキング・切り込み・入力項目なし（ショット））。

加工の最低単価は、単価の自動計算を実装する際に列を追加する（MVP では持たない）。

`category` はショット加工量明細のような集計に使用する。

受注登録画面の番号入力のため、番号の列 `number`（integer、一意）を持つ。

**番号は加工の順番**

番号は、現場で加工する順番に合わせて振る。番号の並びがそのまま工程の流れになるため、受注入力で加工の行を上から工程順に並べやすく、一覧（「/」）でも工程順に並ぶ。

| 番号 | 区分 | 加工種別 |
| --- | --- | --- |
| 10 番台 | 切断機で行う加工 | 11 レーザー・プラズマ孔 / 12 ガス孔 / 13 中抜き / 14 長孔 / 15 ピアス孔 / 16 マーキング / 17 切り込み |
| 20 番台 | 二次加工（工程順） | 20 キリ孔 / 21 タップ孔 / 22 ショット / 23 開先 / 24 曲げ |

- 曲げは、曲げた後にほかの加工ができないため、二次加工の最後に置く
- 新しい加工種別を追加するときも、加工の順番に合う番号を選ぶ（10 番台・20 番台の中で空いている番号）
- レーザー孔とプラズマ孔は単価が同じため、1 つの加工種別（レーザー・プラズマ孔）にまとめている。統合前のプラズマ孔の行は、受注から参照されている可能性があるため削除せず、無効にして番号を空にしている

初期データは seed 004。当初は 11 キリ孔 / 21 レーザー孔 のような番号で投入していたため、投入済みの DB では seed 005 で振り直す（番号の一意制約にぶつからないよう、対象の行の番号をいったん空にしてから振り直す）。

画面から登録された行に番号のないものがある可能性があるため、NULL 可で始めている。マスタ画面では番号を必須にしており、全行に番号が入った後で NOT NULL にする。

### manufacturers（メーカー）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `code` | text | メーカーコード。数字 1 桁（1〜9）。`0` は使えない。一意 |
| `name` | text | メーカー名（メーカーA、メーカーB、メーカーC など） |
| `is_active` | boolean | 有効フラグ |

受注登録画面の明細では、メーカーをコードで選ぶ（テンキーで入力する）。そのため得意先・納入先のコードと同じく数字のみとし、1 桁打てば自動で次の欄へ進むよう 1 桁（1〜9）に固定する（以前は 220 のような 3 桁だった。10 社以上が必要になったら桁数を見直す）。`0` は受注登録画面の「0 指定なし」（`order_items.manufacturer_specified_id` を NULL にする）に使うため、メーカーのコードには使えない。コードで 1 つのメーカーを特定するため、一意制約を設ける（`supabase/migrations/20260930100400_restrict_manufacturer_code.sql`）。

### users（ユーザー）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK。Supabase Auth の user id |
| `employee_no` | text | 社員番号（社員No.）。英大文字と数字で 1〜10 文字。一意・必須。ログインに使う |
| `name` | text | 氏名 |
| `role` | text | ロール。`office` / `factory` / `admin` |
| `department` | text | 部署。`sales` 営業部 / `processing` 加工部 / `shearing` シャーリング部 / `delivery` 配送部 / `general` 経理・総務。通知の宛先に使う |
| `site_id` | uuid | FK → `sites`。所属する営業所。受付登録の加工場所の初期値と、ヘッダーの表示（「本社シャーリング部」）に使う |
| `is_active` | boolean | 有効フラグ |

`factory`（現場）は MVP では運用しないが、ロールの枠組みとして定義しておく。権限はロールで決め、部署・営業所では決めない。

ログインは社員No. で行う。Supabase Auth のユーザーは `{社員No. を小文字にしたもの}@staff.invalid` のメールアドレスで作成し、ログイン画面は打たれた社員No. からこのメールアドレスを作って認証する（basic-design.md「ログイン」）。`auth.users` の作成時に `public.users` の行を作るトリガー（`handle_new_auth_user`）で、メールアドレスの `@` より前を大文字にして `employee_no` に入れる。形の違うメールアドレスではユーザーを作らせない。名前・ロール・部署・営業所は、ユーザーを作るときの追加の情報（`raw_user_meta_data` の `name`・`role`・`department`・`site`）があれば使い、なければ名前は社員No.、ロールは `office`、部署・営業所は空で作る（管理画面の「Create new user」では追加の情報を入れられないため、あとで SQL で入れる。basic-design.md「ユーザーの作り方」）。

### notices（得意先の注意事項）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `customer_id` | uuid | FK → `customers`。NOT NULL |
| `cutting_method` | text | 切断方法の条件（任意）。`シャーリング` / `ガス` / `レーザー` / `プラズマ`（`cutting_prices.cutting_method` と同じ値域） |
| `process_type_id` | uuid | FK → `process_types`。加工種別の条件（任意） |
| `body` | text | 注意事項の本文 |
| `priority` | integer | 表示順（小さいほど上） |
| `is_active` | boolean | 有効フラグ |

得意先・切断方法・加工種別のうち、指定した条件がすべて受注に当てはまったら、受注登録画面（② 注文内容の明細の上）に表示する。切断方法と加工種別は、受注のどこかの行にあれば当てはまるとする。

| 指定した条件 | 表示する受注 |
| --- | --- |
| 得意先だけ | その得意先の受注すべて |
| 得意先 × 切断方法 | その得意先で、その切断方法の行がある受注（例: レーザーのときはケガキマーキング不可でインクジェットマーキング指定） |
| 得意先 × 加工種別 | その得意先で、その加工の行がある受注 |
| 得意先 × 切断方法 × 加工種別 | その得意先で、両方の行がある受注 |

「A 社は常に精度に厳しい」と「A 社はレーザーのときだけ注意」を同一の仕組みで扱える。表示のみで、受注には保存しない。

注意事項を独立したテーブルとするのは、受注に関係のないものまで表示すると件数が増えるにつれ読み飛ばされ、注意喚起として機能しなくなるためである。範囲で表せない条件付きの内容は自動判定せずテキストとして表示する。

当初は「得意先だけ」「加工種別だけ」「その組み合わせ」の 3 通りを 1 つのテーブルで持っていた。加工種別だけの注意事項は板厚・穴径で判定したいものが多いため `process_notices` に分け、`notices` は得意先を必須にした。既存の加工種別だけの行は `process_notices` に移した（`supabase/migrations/20261003100000_split_customer_and_process_notices.sql`）。

### process_notices（加工の注意事項）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `process_type_id` | uuid | FK → `process_types`。NOT NULL |
| `thickness_min` / `thickness_max` | numeric | 板厚の範囲（mm。任意）。加工の行の母材（材料の行）の板厚で判定する |
| `hole_diameter_min` / `hole_diameter_max` | numeric | 穴径の範囲（mm。任意）。入力の形が「穴」の加工の行で、入力した穴径で判定する |
| `body` | text | 文言 |
| `is_active` | boolean | 有効フラグ |

加工種別が一致し、範囲を指定した項目がすべて範囲に入る加工の行のすぐ下に、文言を小さく表示する。表示のみで、受注には保存せず、登録も止めない。

- 範囲はどちらも「以上・以下」（境界の値を含む）。片方だけの指定もできる（例: 板厚 13 以上）
- 範囲を指定しない場合は、その加工種別の行すべてに表示する
- 範囲を指定しているのに値がまだ入力されていない（母材の板厚・穴径が未入力）場合は表示しない
- 穴径の範囲は、入力の形が「穴」の加工種別のときだけ指定できる（マスタ画面で確認する。ほかの形では穴径を入力しないため、一度も表示されなくなる）
- 下限 ≤ 上限、値は正の数（チェック制約）

例: キリ孔・穴径 30 以上 →「精度注意」、曲げ・板厚 13 以上 →「12mm を超える曲げは要確認」

### stamps（スタンプ文言）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `body` | text | 文言（雨濡れ厳禁 など） |
| `number` | integer | 番号（一意、NOT NULL、1 以上）。受注登録画面で番号を打って付け外しする。並び順にも使う |
| `is_active` | boolean | 有効フラグ |

現場用伝票に印字する文言を登録しておき、受注入力時にチェックしたものを伝票に反映する。

同じ文言を複数の得意先が指定するため、得意先との関連は `customer_stamps` で保持する。

受注登録画面はテンキーで操作するため、スタンプにも番号の列 `number` を持たせる（ほかのマスタの番号と同じ考え方。0 は「いつもの値」に取っておくため 1 から）。並び順も番号で決めるため、当初の表示順の列 `display_order` は削除した。並び順の列が 2 つあると食い違うためである。既存の行には、それまでの表示順で 1 から番号を振った（`supabase/migrations/20261003100100_add_stamp_numbers_and_save_order_aux.sql`）。

### customer\_stamps（得意先の既定スタンプ）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `customer_id` | uuid | FK → `customers` |
| `stamp_id` | uuid | FK → `stamps` |

ここに登録された文言は、その得意先の受注入力時に初期状態でチェックが入る。客先指定の文言を毎回選ぶ必要がなくなる。

`customer_id` + `stamp_id` に一意制約を設ける。

### delivery\_methods（配達方法）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `number` | integer | 番号（一意）。受注登録画面の配達の番号として使う |
| `name` | text | 配達方法名（宵積み、2便、置場引取、営業配達、横持ち、宅急便、フリー） |
| `requires_note` | boolean | 選んだときに文字の入力欄を出すか（フリーのみ true） |
| `is_active` | boolean | 有効フラグ |

配達方法は今後増える可能性があるため、定数ではなくマスタで持つ。初期データは 0 宵積み / 2 2便 / 3 置場引取 / 4 営業配達 / 5 横持ち / 6 宅急便 / 9 フリー。

「フリー」を名前で判定せず `requires_note` で判定する。受注に保存するのは配達方法（`orders.delivery_method_id`）と、フリー入力の文字（`orders.delivery_method_note`）である。

## トランザクションテーブル定義

### orders（受注ヘッダー）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `order_no` | text | 受注番号。受付No.＋枝番（例: `26-1003-1`）。`create_order` の中で採番する。一意 |
| `intake_id` | uuid | FK → `intakes`。受付。NOT NULL（受注はすべて受付を通す） |
| `work_unit_id` | uuid | FK → `work_units`。どの加工区分から起票したか。NOT NULL。受付と同じ受付の加工区分に限る（`(work_unit_id, intake_id)` の複合外部キー） |
| `branch_no` | integer | 枝番。`intake_id` + `branch_no` で一意 |
| `member_class` | text | 部材区分。`NONE`（無分類）/ `DF` / `GPL` / `BH` / `SPL`。既定 `NONE`。**`SPL` がスプライス専用の受注** |
| `site_id` | uuid | FK → `sites`。加工場所。出荷待ちを加工場所ごとに分けるのに使う。NOT NULL。受注登録画面の作り直しで前倒しして追加（既存の受注は本社にした） |
| `staff_id` | uuid | FK → `users`。担当者（自社）。画面の初期値はログイン中のユーザーで、変更できる。加工指示書に印字する |
| `is_urgent` | boolean | 至急。NOT NULL、既定 false。受付の至急（`intakes.is_urgent`）を初期値として入れ、受注情報の番号の欄（0 通常 / 1 至急）で変えられる。現場で優先して加工してもらうための印で、現場用伝票の印刷や受注の一覧で使う |
| `order_date` | date | 受注日。登録日を初期値とし、必要な場合のみ変更する |
| `customer_id` | uuid | FK → `customers`。売り先（得意先） |
| `customer_contact` | text | 担当者（客先担当）。得意先側の窓口担当者 |
| `delivery_destination_id` | uuid | FK → `delivery_destinations`。入れ先（納入先）。NULL は売り先と同じ（受注登録画面の「0 売り先と同じ」）。表示・印刷では、NULL のとき売り先の名前を入れ先として出す |
| `project_name` | text | 工事名 |
| `due_date_type` | text | 納期種別。`確定` / `仮納期` / `後報` / `最短出荷` |
| `due_date` | date | 納期。`後報` `最短出荷` では NULL |
| `status` | text | `加工待ち` / `出荷待ち` / `配送依頼済み` / `完了` |
| `created_by` | uuid | FK → `users`。登録の操作をした人（記録用。担当者 `staff_id` とは別に、変更できない値として残す） |
| `remarks` | text | 摘要 |
| `field_note` | text | 現場用伝票に印字するフリーコメント |
| `created_at` / `updated_at` | timestamptz |  |
| `deleted_at` | timestamptz | 論理削除した日時。NULL は有効な受注 |
| `joint_no` | text | 継手番号（任意。10 文字以内）。スプライス専用の受注のみ |
| `splice_shot` | boolean | ショット加工の有無。スプライス専用の受注のみ。明細の仕入単価（`special_product_prices.has_shot`）の引き当てと、「ショット加工」の印字に使う |
| `delivery_method_id` | uuid | FK → `delivery_methods`。配達。NOT NULL |
| `delivery_method_note` | text | 配達がフリーのときに入力する文字。「フリーのときは必須」は別テーブルの値を見る条件のため、アプリ側で検証する |

**スプライス専用の受注**

スプライスは通常の明細と混ざることがないため、受注単位で切り替える。部材区分が `SPL` の受注がスプライス専用の受注である。以前はスプライスの印（`is_splice`）を部材区分とは別に持っていたが、両者が食い違わないよう部材区分にまとめ、`is_splice` は廃止する。部材区分の追加と `is_splice` の廃止は、受注登録画面の作り直し（画面を分ける PR）のマイグレーションで行う。受付のテーブルより先に入れる。スプライス専用の受注では、明細はすべて `special_product_types.is_splice_order_type` が true の種別になり、ショットの有無も受注単位（`splice_shot`）で持つ。

`splice_shot` が true の受注は、現場用伝票に「ショット加工」を目立つ位置に印字する。これは `order_stamps` には保存せず `splice_shot` から印字する。ショットの有無とスタンプを別々に持つと、両者が食い違うおそれがあるためである。

チェック制約として、`member_class` が `SPL` 以外のときは `joint_no` と `splice_shot` を NULL とし、`SPL` のときは `splice_shot` を必須とする。`joint_no` は任意で、入力する場合は 1〜10 文字とする（空欄は NULL で保存する）。当初は 4〜6 文字の必須としていたが、長い継手番号があり、継手番号のない受注もあるため変更した（`supabase/migrations/20261001100100_optional_joint_no_and_same_as_customer_destination.sql`）。

**論理削除**

受注の削除（受注登録画面の処理区分 2 削除）は論理削除とし、行は消さずに `deleted_at` に削除日時を入れる。`deleted_at` が入った受注は、受注一覧・現場用伝票・送り状発行などの対象から外す。誤って削除した場合の確認や、過去の受注番号の追跡ができるようにするためである。

出荷実績（`shipments`）がある受注は、削除も修正もできない（業務の決まり「受注 → 送り状 → 仕入」の逆順でしか直せないため。basic-design.md「仕入入力」の「修正の順番」）。画面で止めるだけでなく、DB 側でも拒否する。

- `orders` の `before update` トリガー `orders_prevent_deleting_shipped`: 送り状がある受注では、`deleted_at` を設定する更新と、状態（`status`）・`updated_at` 以外の列の変更を拒否する（PR 9b で修正にも広げた）
- `order_items`・`order_item_processes`・`order_stamps` の `before insert/update/delete` トリガー（`prevent_changing_shipped_order_lines`）: 送り状がある受注の明細・加工の行・スタンプの追加・変更・削除を拒否する（PR 9b）

仕入入力を作るときに、仕入がある送り状は削除できないようにする（後述「Phase2 での拡張ポイント」の「仕入」）。

**受注の変更・削除（update_order・delete_order。PR 9b）**

- `update_order(p_order_id, p_expected_updated_at, p_order, p_items) → text`: 処理区分 1 変更。ヘッダーの列を書き換え、明細・加工の行・スタンプを消して入れ直す（入れ直しの分は物理的に消す。明細の行は受注の一部で、送り状の明細から参照される受注は先に断るため）。受注番号・枝番・受付・加工区分・登録した人（`created_by`）は変えない。加工場所を変えても受付の加工場所は変えない
- `delete_order(p_order_id, p_expected_updated_at) → text`: 処理区分 2 削除。`deleted_at` を入れる。加工区分・受付の状態は変えない
- どちらも、画面を開いたときの `updated_at` と今の値が違えば `ORDER_CHANGED`、送り状があれば `ORDER_HAS_SHIPMENTS`、削除済みなら `ORDER_DELETED` のエラーにする。`orders` には `updated_at` を自動で更新するトリガーがないため、この 2 つの関数で `now()` を入れる
- `security definer`（関数所有者の権限で実行）にし、関数の中で事務・管理者かを確かめる。明細・加工の行・スタンプの削除は RLS で管理者だけに許しているため、事務が変更するときの入れ直しは所有者の権限で行う（事務に明細の削除の権限そのものは付けない）。`search_path` は空にして、テーブルはスキーマ名つきで書く
- 明細・加工の行・スタンプの登録は、`create_order` と共通の `private.insert_order_lines(p_order_id, p_order, p_items)` で行う
- 実装は `supabase/migrations/20261025100000_add_order_edit_and_delete.sql`

ステータスは受注ヘッダーに 1 つ持つ。実務では同一受注内の明細がまとめて加工・出荷されるため、明細単位の管理は行わない。

納期は種別と日付の 2 つで保持する。日付の有無だけでは `後報`（待ち）と `最短出荷`（急ぎ）を区別できないためである。

**受注番号の採番**

受注番号は「受付No.＋枝番」（例: 受付 `26-1003` の 1 件目の受注は `26-1003-1`）とする。受注はすべて受付を通すため、どの受注も受付No. を持つ。受注番号の欄ではハイフンを入力できるようにする（screen-design.md「キー操作」）。

- 枝番は受付ごとの連番。受付の `intakes.last_branch` を 1 進めて番号を返す採番関数 `private.issue_order_branch()` を、`create_order` の中から呼ぶ
- 同時に登録されても枝番が重複しないよう、受付の行をロックして連番を進める。受注の登録と同じ transaction で行うため、登録が失敗すると枝番も取り消される
- 採番関数は、Data API で公開していない `private` スキーマに置く。ブラウザから直接呼ばれて番号が飛ぶことを防ぐためである
- 受付No. の採番は docs/intake/table-design.md「番号」を参照

以前は「年 2 桁 + 年内の連番 5 桁」（例: `2600001`）を、`orders.order_no` の初期値の採番関数 `private.next_order_no()` で採番していた（`supabase/migrations/20260930100000_add_order_no_numbering.sql`）。受付No.＋枝番に切り替えるマイグレーション（`supabase/migrations/20261024100000_link_orders_to_intakes.sql`。PR 9）で、この初期値・採番関数・採番テーブル（`private.order_no_counters`）を削除した。切り替えの前に登録したテストデータの受注（出荷のテストデータも含む）は、同じマイグレーションの先頭で削除した。

**受注の登録（create_order）**

ヘッダーと明細は、DB の関数 `create_order(p_order jsonb, p_items jsonb)` で 1 回にまとめて登録し、採番された受注番号を返す。Supabase のクライアント（PostgREST）は複数の insert を 1 つの transaction にまとめられないため、関数にしている。関数の中の処理は 1 つの transaction で実行されるため、明細の登録で失敗すると、ヘッダーの登録と受注番号の採番も取り消される。

- 引数はそれぞれ `orders`・`order_items` の列名をキーにした JSON（明細は配列で 1 件以上）
- 明細の各要素は `processes` に、その材料にぶら下がる加工（`order_item_processes` の列名をキーにした JSON の配列）を持つ。材料の行を登録した ID を `order_item_id` に入れて加工を登録する（単位を省略した場合は「個」）。加工の項目（`spec_fields`）も JSON のまま受け取って登録する
- ヘッダーの JSON に、フリーコメント（`field_note`）と、チェックしたスタンプの id の配列（`stamp_ids`）を持つ。明細の後に `order_stamps` に登録する（スプライス専用の受注の「ショット加工」は含めない）
- ヘッダーの JSON に部材区分（`member_class`）を持つ（以前の `is_splice` の代わり。受注登録画面の作り直しで変更）
- ヘッダーの JSON に、受付（`intake_id`）・加工区分（`work_unit_id`）・加工場所（`site_id`）・担当者（`staff_id`）・至急（`is_urgent`）を持つ。加工区分が受注登録待ち（`ready`）でその受付のものかを確かめ（違えば `WORK_UNIT_NOT_READY` のエラー）、受注の insert の前に `private.issue_order_branch()` で枝番を採番し、受注番号を決める。加工場所が受付と違えば、受付の加工場所も更新する（docs/intake/table-design.md「関数」）。この変更は、受付のテーブルを作るマイグレーション（PR 3）ではなく、受注登録画面と受付をつなぐ PR 9 で行った（受注に必須の受付の列を先に足すと、受付のない今の受注登録画面から登録できなくなるため）
- `security invoker`（呼び出したユーザーの権限で実行）にして、`orders`・`order_items` の RLS をそのまま効かせる
- 登録の操作をした人（`created_by`）は引数で受け取らず、ログイン中のユーザー（`auth.uid()`）を入れる
- 入力内容の確認と、重量・仕入単価の計算は、呼び出し側の Server Action（`app/orders/new/actions.ts`）で済ませてから渡す
- 実行権限は `authenticated` にだけ付与する

実装は `supabase/migrations/20260930100300_create_create_order_function.sql`（加工の登録を加えたものは `20261001100000_create_order_with_processes.sql`、フリーコメントとスタンプを加えたものは `20261003100100_add_stamp_numbers_and_save_order_aux.sql`、受付とつないだものは `20261024100000_link_orders_to_intakes.sql`、明細の登録を `private.insert_order_lines` に分けたものは `20261025100000_add_order_edit_and_delete.sql`）を参照。

### order\_items（受注明細）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `order_id` | uuid | FK → `orders` |
| `line_no` | integer | 行番号 |
| `product_id` | uuid | FK → `products` |
| `cutting_method` | text | 切断方法。`シャーリング` / `ガス` / `レーザー` / `プラズマ`。`cutting_prices.cutting_method` と同じ値域。定尺売りの場合は NULL |
| `cutting_type` | text | 寸法切 / アイトレ。定尺売り・特殊製品は NULL（ただしスプライス専用の受注の明細は、画面の切断区分を保存する） |
| `special_product_type_id` | uuid | 特殊製品の場合に指定。通常の切断・定尺売りは NULL |
| `plate_size` | text | 定尺サイズ。`3x6` / `4x8` / `5x10`。定尺売りの場合のみ指定 |
| `steel_making` | text | 電炉材 / 高炉材。受注時に確定し、後から変更可。画面の初期値は電炉材。定尺売り、または種類が材質エキストラを適用しない（`plate_types.applies_material_extra` が false）場合は NULL |
| `width` | numeric | 巾（mm）。ササラは使用材の寸法 |
| `length` | numeric | 長さ（mm）。ササラは使用材の寸法 |
| `outer_diameter` | numeric | 外径（mm）。ベタ丸・ドーナツで使用 |
| `inner_diameter` | numeric | 内径（mm）。ドーナツで使用 |
| `quantity` | integer | 数量 |
| `square_weight` | numeric | 角重量（1 枚あたり kg）。単価計算の根拠 |
| `actual_weight` | numeric | 実重量（1 枚あたり kg）。配送依頼用。寸法から求まるもの（寸法切・ベタ丸・ドーナツ）は自動計算、アイトレなどは送り状発行の画面で必要な行だけ手入力 |
| `material_weight` | numeric | 使用材の重量（1 枚あたり kg）。ササラで使用。使用材の寸法から自動計算 |
| `cutting_unit_price` | numeric | 仕入単価（各エキストラ加算後。枚単価の場合は保証重量を掛けた後の値）。マスタから自動計算。別途見積もりは NULL（単価未定）で登録し、仕入入力の画面で入力する（予定。basic-design.md「仕入入力」） |
| `sales_unit_price` | numeric | 売上単価。MVP では使用しない（Phase2 の営業システム連携で扱う） |
| `price_unit` | text | kg / 枚。角重量から自動判定（ベタ丸・ドーナツは常に枚） |
| `manufacturer_specified_id` | uuid | FK → `manufacturers`。メーカー指定。指定なしは NULL。縞板は必須 |
| `manufacturer_used_id` | uuid | FK → `manufacturers`。使用メーカー。加工時に入力 |
| `mill_sheet_no` | text | ミルシート番号。加工時に入力 |
| `package_count` | integer | 梱包数。製品ラベルの印刷枚数。受注後のラベル発行メニューで手入力 |
| `remarks` | text | 備考 |
| `field_note` | text | この明細だけに適用するフリーコメント（摘要）。**使わない**（登録時は NULL）。後述 |

メーカーは「指定」と「実績」で確定タイミングが異なるため別カラムとする。同一カラムで兼ねると、指定のない受注に実績が入った際に客先指定があったように見えてしまう。縞板のみ、縞目の見た目が異なるため受注時に客先へ確認しており、`manufacturer_specified_id` が単位質量の参照にも使われる。

重量は角重量と実重量を分けて保持する。請求は角重量で行い（材料としては四角で消費するため）、配送依頼には実重量を用いる。寸法切は両者が一致し、ベタ丸・ドーナツは外径・内径から両方を算出する。アイトレの実重量は受注入力では扱わず、送り状発行の画面で必要な行だけ手入力する。

画面の「切断・区分」（切断方法と区分をまとめた 2 桁の番号。例: 41 レーザー寸法切、47 レーザーベタ丸、71 定尺、9 加工）は 1 つの番号の欄だが、保存時は `cutting_method`・`cutting_type`・`special_product_type_id`・`plate_size` に振り分ける（加工は `order_item_processes` の行になる）。シャーリングの「型切り」（12）は、`cutting_type` を `アイトレ` として保存する（新しい切断区分は作らない）。スプライスは区分ではなく受注単位（部材区分 `orders.member_class = 'SPL'`）で扱う。振り分けの対応は screen-design.md「受注登録画面」を参照。

明細ごとの摘要（`order_items.field_note`・`order_item_processes.remarks`）は使わない。特定の行について伝えたいことも、受注全体のフリーコメント（`orders.field_note`）に書く運用とした（screen-design.md「スタンプ・フリーコメントの帯」）。列は消さずに残し、受注登録では NULL を入れる。過去の受注に値が入っている可能性と、運用を戻す可能性があるためである。

`product_id` は必須のため、商品マスタに該当がない板厚（取り扱いのない板厚）の明細は登録できない。受注登録画面では警告を出して登録させない。

`cutting_unit_price` が NULL の明細は「単価未定」（別途見積もりで単価が未入力）を表す。仕入入力の画面で、単価を入力する明細を探すのに使う。

`price_unit` は 1 枚あたりの角重量から自動判定する。1.5kg 未満・2kg 未満はいずれも枚単価となり、kg 単価に最低保証重量を掛けて算出する。

### order\_item\_processes（加工明細）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `order_item_id` | uuid | FK → `order_items` |
| `line_no` | integer | 行番号 |
| `process_type_id` | uuid | FK → `process_types` |
| `spec` | text | 加工内容（自由入力の形の加工のみ。例: `1S/ 2孔 30X12φ`）。項目で入力する加工は NULL |
| `spec_fields` | jsonb | 加工の項目（項目で入力する加工のみ。自由入力の形は NULL）。形は後述 |
| `quantity` | integer | 加工数量。穴・曲げは母材の枚数から自動計算した値 |
| `price_unit` | text | 単価の単位。`個` / `kg`。既定は `個` |
| `unit_price` | numeric | 加工の仕入単価。MVP では手入力 |
| `remarks` | text | 摘要。**使わない**（登録時は NULL。`order_items.field_note` と同じ） |

1 つの材料に複数の加工（穴あけ + 曲げ + ショット）が付くケースを表現するため、受注明細の子テーブルとする。加工指示書では加工が重量ゼロの別行として印字されるが、これは材料重量を二重に計上しないための表示上の処理である。

加工の仕入金額は `price_unit` で求め方が変わる。`個` は「仕入単価 × 数量」、`kg` は「仕入単価 × 母材の合計重量」とする。重量建ての加工の重量は材料の重量と一致するため、加工明細に重量カラムは持たない。親の `order_items` の重量（単価の根拠にした重量。`square_weight`、ササラは `material_weight`）と数量から算出する。同じ値を 2 箇所に保持すると、寸法修正時にずれる原因となる。

**加工の項目（spec_fields）**

項目で入力する加工は、入力の形に応じた項目を `spec_fields` に 1 つの JSON オブジェクトとしてまとめて保存する。入力の形ごとに項目が異なり、今後も形を 1 つずつ追加していくため、形ごとに列を増やさず JSON にしている。中身の確認は保存する側（Server Action）で行い、DB ではオブジェクトであることだけをチェック制約で確かめる。

`shape` に保存した時点の入力の形を持たせる。あとで加工種別マスタの `input_shape` が変わっても、保存済みの行の項目を正しく読めるようにするためである。

| 入力の形 | `spec_fields` の例 |
| --- | --- |
| 穴 | `{"shape": "穴", "holes_per_piece": 12, "hole_diameter": 38}` |
| 曲げ | `{"shape": "曲げ", "bend_count": 2, "bend_style": "二方", "bend_style_note": null}` |
| 曲げ（曲げ方がフリー） | `{"shape": "曲げ", "bend_count": 1, "bend_style": "フリー", "bend_style_note": "R"}` |

- `holes_per_piece`: 1 枚あたりの孔数（整数）、`hole_diameter`: 穴径（mm）
- `bend_count`: ヶ所数（整数。9 フリーで入力した数もここに入る）
- `bend_style`: `90°` / `二方` / `三方` / `四方` / `フリー`。単価の追加料金（二方・三方・四方）の判定に使えるよう、選択肢の値で持つ。`フリー` のときだけ `bend_style_note` に入力した文（「曲げ」を除いた部分。`R`、`85°` など）を入れる。伝票の文は「〇ヶ所 〇曲げ」の形に組み立てる（`1ヶ所 90°曲げ`、`1ヶ所 R曲げ`）

伝票に載せる文（加工内容）は `spec_fields` から組み立て、`spec` には保存しない。同じ内容を 2 箇所に持つと、食い違う原因になるためである。

**加工数量の保存**

穴・曲げの数量は母材の枚数から計算できる値だが、`quantity` に保存する。自由入力の加工と同じ列で、印刷・集計・仕入金額の計算ができるようにするためである（材料の行の重量を保存しているのと同じ扱い）。食い違いを防ぐため、数量は画面の入力値を使わず、受注を保存するたびに保存する側で `spec_fields` と母材の枚数から計算し直す。

### shipments（出荷実績）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `order_id` | uuid | FK → `orders` |
| `shipment_no` | text | 送り状番号。自動採番 |
| `shipped_date` | date | 出荷日 |
| `created_by` | uuid | FK → `users` |
| `created_at` | timestamptz |  |

### shipment\_items（出荷明細）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `shipment_id` | uuid | FK → `shipments` |
| `order_item_id` | uuid | FK → `order_items` |
| `quantity` | integer | 出荷数量 |
| `weight` | numeric | 出荷重量 |

分割出荷は出荷実績を積み上げることで表現する。残数量はカラムを持たず「受注数量 − 出荷実績の合計」として算出する。

### attachments（添付ファイル）【廃止】

**このテーブルは使わない。** 注文書・図面・CSV は受付の時点で `intake_files` に保存し、受注からは受付（`orders.intake_id`）・加工区分（`orders.work_unit_id`）を通してたどる（docs/intake/table-design.md「intake_files」）。ファイルの置き場所を 1 つにし、受付と受注で同じファイルを別々に持たないためである。テーブルは `supabase/migrations/20261024100000_link_orders_to_intakes.sql`（PR 9）で削除した。以下は廃止前の定義の記録である。

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `order_id` | uuid | FK → `orders` |
| `file_name` | text | ファイル名 |
| `file_type` | text | `pdf` |
| `storage_path` | text | Supabase Storage のパス |
| `uploaded_by` | uuid | FK → `users` |
| `created_at` | timestamptz |  |

注文書は現場用伝票のチェック工程でアップロードする。事務側の手配ミスが疑われた際に、受注内容と注文書を突き合わせられるようにするためである。

FAX で届いた注文書も、CAD データから出力した CSV を印刷したものも、同じようにスキャンして PDF として登録する。受注の経路による区別は設けない。

### order\_stamps（受注に付けたスタンプ）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `order_id` | uuid | FK → `orders` |
| `stamp_id` | uuid | FK → `stamps` |

受注ごとにチェックされたスタンプ文言を保持する。`order_id` + `stamp_id` に一意制約を設ける。

材質による色分けと「材質ライン要」の印字は、材質の値から判定できるためデータとして保持せず、印刷処理側で判断する。

## リレーション

```
intakes（受付）──< work_units（加工区分）──< orders     ← docs/intake/table-design.md
   └─< intake_files（注文書・図面・CSV）

customers ──┐
            ├─< orders ──< order_items ──< order_item_processes
delivery_   ┘      │            │                    │
destinations       │            │                    └── process_types
                   │            ├── products ──> plate_types / materials
                   │            ├── manufacturers （指定 / 実績の2方向）
                   │            └── special_product_types
                   │
                   ├─< shipments ──< shipment_items ──> order_items
                   ├─< order_stamps ──> stamps
                   ├── delivery_methods （配達）
                   ├── sites （加工場所）
                   └── users （staff_id 担当者 / created_by 登録した人）

customers ──< customer_stamps >── stamps
notices   ──> customers（必須）/ process_types（任意）
process_notices ──> process_types

── 価格系（値で照合。products への外部キーは持たない）──
cutting_prices        ──> plate_types / materials（NULL = SS400ベース）
standard_plate_prices ──> plate_types / materials
special_product_prices ──> special_product_types / plate_types
material_extras       ──> materials（材質ごとに1行）
thickness_extras / large_plate_extras  板厚で照合
unit_weights          ──> plate_types / manufacturers（× 板厚）
```

### 主な関連

| 親 | 子 | 関係 | 説明 |
| --- | --- | --- | --- |
| `orders` | `order_items` | 1 : N | 1 受注に複数の材料明細 |
| `order_items` | `order_item_processes` | 1 : N | 1 材料に複数の加工 |
| `orders` | `shipments` | 1 : N | 分割出荷のため複数回 |
| `shipments` | `shipment_items` | 1 : N | 1 回の出荷で複数明細 |
| `order_items` | `shipment_items` | 1 : N | 1 明細が複数回に分けて出荷される |
| `intakes` | `orders` | 1 : N | 1 受付から複数の受注（枝番） |
| `work_units` | `orders` | 1 : N | 1 加工区分から複数の受注 |
| `intakes` | `intake_files` | 1 : N | 注文書 PDF・DXF・CSV |

### 参照の考え方

価格系テーブル（`cutting_prices` `standard_plate_prices` `special_product_prices` `material_extras` `thickness_extras` `large_plate_extras` `unit_weights`）は `products` への外部キーを持たず、種類・材質・板厚などの値で照合する。単価は切断方法や特殊製品種別など商品以外の条件も含むため、商品と 1 対 1 で対応しないためである。

`order_items` は `manufacturers` を 2 方向から参照する。`manufacturer_specified_id`（受注時の客先指定）と `manufacturer_used_id`（加工時の実績）は性質が異なるため、別々の外部キーとして持つ。

## 設計上の補足

### 受注登録画面のための追加方針

受注登録画面（screen-design.md）をテンキーだけで入力できるコード入力にするため、次の変更を行う。マイグレーションは `supabase/migrations/20260929100000`〜`20260929100300` の 4 ファイル、初期データは seed 001〜004 を参照。

| 対象 | 変更 |
| --- | --- |
| `plate_types` / `materials` / `special_product_types` / `process_types` | 番号の列 `number`（integer、一意）を追加 |
| `special_product_types` | `is_splice_order_type`（スプライス専用の受注で使う種別か）を追加 |
| `delivery_methods` | 配達方法マスタを新規作成 |
| `orders` | `is_splice` / `joint_no` / `splice_shot` / `delivery_method_id` / `delivery_method_note` / `deleted_at` を追加（`is_splice` は受注登録画面の作り直しで部材区分 `member_class` にまとめて廃止） |
| `order_item_processes` | `price_unit`（個 / kg）を追加 |
| `customers` / `delivery_destinations` | `code` を数字のみに制限するチェック制約を追加（既存データが数字のみであることを確認してから）。`delivery_destinations` はさらに `0` を禁止（「0 売り先と同じ」に使うため） |
| `orders` | `delivery_destination_id` を NULL 可に変更（NULL は売り先と同じ） |
| 価格マスタの行を取り出す関数 | 明細の条件に該当する価格マスタの行だけを返す `security definer` の関数を作成（後述「価格マスタの権限と単価計算」） |
| 受注の削除の制限 | 出荷実績がある受注の論理削除を拒否するトリガーを作成（`orders` の「論理削除」を参照） |
| `order_items` | `plate_size`（定尺サイズ）を追加 |

番号の持ち方は、選択肢の性質で分ける。

- 今後増える可能性がある選択肢（種類・材質・特殊製品種別・加工種別・配達方法）は、マスタの `number` 列で持つ
- 固定の選択肢（処理区分・切断方法・区分・製鋼法・納期種別・定尺サイズ・部材区分）の番号は、アプリ側の定数で持つ。DB に保存するのは番号ではなく値（例: `cutting_method` は `ガス`）とし、番号は画面の入力にだけ使う

メーカーは既存の `manufacturers.code`（メーカーコード）を番号として使う。「0 指定なし」はマスタの行ではなく、`manufacturer_specified_id` を NULL にすることを表す。

入れ先も同じ考え方で、既存の `delivery_destinations.code`（納入先コード）を番号として使い、「0 売り先と同じ」はマスタの行ではなく、`orders.delivery_destination_id` を NULL にすることを表す。

### 計算で求める項目

以下はカラムとして保持せず、必要時に算出する。保存すると元データの修正時に古い値が残り、整合性が崩れるためである。

| 項目 | 算出方法 |
| --- | --- |
| 残数量 | 受注数量 − 出荷実績の合計 |
| 重量区分（保証重量） | 1 枚あたりの重量と単価の行のフラグ（`has_light_tier` など）で判定。basic-design.md「最低保証重量」を参照 |
| 明細金額 | 枚単価 × 数量、または kg 単価 × 合計重量。円未満は切り上げ（basic-design.md「明細金額」を参照） |
| 加工の金額 | 個: 単価 × 数量、kg: 単価 × 母材の合計重量。円未満は切り上げ |
| 受注合計 | 材料の明細金額と加工の金額の合計 |

角重量・実重量は寸法と材質（縞板は単位質量）から算出できるため、入力者に選択させず自動計算する。ササラの使用材重量も、入力された使用材の寸法から自動計算する。ただしアイトレの実重量は形状が一定でないため、送り状発行の画面で必要な行だけ手入力する。

1 枚あたりの重量は丸めずに保証重量の判定・単価計算に使う。合計重量は 1 枚あたりの重量に枚数を掛けた後、小数第 2 位までに四捨五入する（切り捨ては行わない）。

### 制約

- `products` の `plate_type_id` + `material_id` + `thickness` + `shape` に一意制約
- 価格系テーブル（`cutting_prices` `standard_plate_prices` `special_product_prices` など）は、それぞれの条件の組み合わせに一意制約（`valid_from` を含む）。詳細は各テーブルの説明を参照
- `material_extras.material_id` に一意制約（材質ごとに1行）
- `plate_types` `materials` `special_product_types` は `name` に一意制約
- `plate_types` `materials` `special_product_types` `process_types` `delivery_methods` は `number` に一意制約
- `stamps.number` に一意制約（1〜99）
- 番号の範囲（受注登録画面の番号の欄の上限の桁数に合わせる。screen-design.md「番号の桁数と自動で次へ」）: `plate_types` `materials` `delivery_methods` の `number` は 0〜9、`special_product_types.number` は 0〜9（1・2・3・9 を除く）、`process_types.number` は 10〜99、`sites.number` は 1〜9（`supabase/migrations/20261017100200_restrict_code_digits.sql`）
- `products.thickness` は数字 2 桁まで（0.1〜9.9 と 1〜99 の整数）。受注登録画面の板厚の欄が数字 2 桁で自動で次へ進むため
- `notices.customer_id` は NOT NULL。`notices.cutting_method` は切断方法の値に限る
- `process_notices` の範囲は正の数で、下限 ≤ 上限
- `process_types.input_shape` は入力の形の値の一覧に限る。`order_item_processes.spec_fields` は NULL か JSON オブジェクト
- `customers` `delivery_destinations` の `code` は数字 4 桁、`manufacturers.code` は数字 1 桁（1〜9）（`delivery_destinations` はさらに `0` を禁止。`manufacturers` はさらに `0` を禁止し、一意制約）
- `special_product_types.is_splice_order_type` が true の行は 1 行だけ（部分一意インデックス）
- `orders` のスプライス関連の列（`member_class` / `joint_no` / `splice_shot`）の整合性チェック（`orders` の説明を参照）
- `orders.member_class` は部材区分の値（`NONE` `DF` `GPL` `BH` `SPL`）に限る
- `orders` の `intake_id` + `branch_no` に一意制約。`work_unit_id` は同じ受付の加工区分に限る
- `users.employee_no` に一意制約・形の check 制約（英大文字と数字で 1〜10 文字）・NOT NULL
- `shipment_items.quantity` に正数チェック
- 出荷数量の累計が受注数量を超えないことを、アプリケーション側と DB 側の両方で検証する
- `orders.due_date` は `due_date_type` が `確定` `仮納期` の場合に必須

### RLS 方針

ロールごとに行・列レベルのアクセス制御を Supabase の RLS で定義する。クライアント側の表示制御のみに依存しない。

| テーブル | office（事務） | factory（現場） | admin（管理者） |
| --- | --- | --- | --- |
| `orders` | 参照・登録・更新 | 参照・ステータス更新のみ | すべて |
| `order_items` | 参照・登録・更新 | 参照（単価列を除く） | すべて |
| `order_item_processes` | 参照・登録・更新 | 参照（単価列を除く） | すべて |
| `shipments` / `shipment_items` | 参照・登録・更新 | 参照不可 | すべて |
| `attachments`（廃止） | 参照・登録・更新 | 参照不可 | すべて |
| 受付のテーブル（`intakes` `intake_destinations` `work_units` `intake_files` など） | 参照・登録・更新 | 参照不可 | すべて |
| `sites` | 参照 | 参照 | すべて |
| 目安納期（`lead_time_items` など） | 参照・登録・更新 | 参照 | すべて |
| `notifications` | 自分の部署の行を参照 | 自分の部署の行を参照 | 自分の部署の行を参照 |
| `order_stamps` | 参照・登録・更新 | 参照 | すべて |
| `users` | 参照 | 参照 | すべて |
| 価格系マスタ（`cutting_prices` `material_extras` `thickness_extras` `large_plate_extras` `standard_plate_prices` `special_product_prices`） | 参照不可（価格マスタの行を取り出す関数で、明細の計算に必要な行だけ取得可） | 参照不可 | すべて |
| マスタ各種（`plate_types` `special_product_types` `unit_weights` `delivery_methods` `notices` `process_notices` `stamps` `customer_stamps` を含む） | 参照 | 参照 | すべて |

`order_item_processes` / `shipments` / `shipment_items` / `attachments` / `order_stamps` / `users` は元の設計時点では個別に定めていなかったテーブルである。`orders` `order_items` `マスタ各種` に適用した考え方（現場の業務範囲は「加工指示の閲覧」に限られる、単価情報は現場に見せない）を、各テーブルの性質に当てはめて追加した。

- `order_item_processes` の `unit_price`（加工単価）は `order_items` の単価列と同じ性質の情報のため、同様に現場からは隠す。
- `shipments` / `shipment_items`（送り状）と `attachments`（注文書ファイル）は、送り状発行・ファイル管理のいずれも事務の業務であり現場の業務範囲に含まれないため、現場は参照不可とする。
- `order_stamps` は現場用伝票にそのまま印字される内容であり、単価情報のような機密性もないため、現場にも参照を許可する。
- 受付のテーブルの詳細（削除の扱い、トリガーだけが書くテーブルなど）は docs/intake/table-design.md「RLS・権限・Realtime・Storage」を参照。受付の作業は事務所の業務であり、現場の業務範囲に含まれないため、現場は参照不可とする。
- `users` は担当者・出荷担当者などの氏名表示にどのロールからも参照できる必要があるため参照は全ロールに許可し、登録・更新は管理者のみとする。
- 価格体系の再設計（切断単価・各種エキストラ・定尺単価・特殊製品単価）により `prices` は廃止されたが、単価情報を現場に見せないという方針自体は変わらないため、価格系の新テーブルすべてに同じ制限を引き継ぐ。`plate_types`（種類）・`special_product_types`（特殊製品種別）・`unit_weights`（単位質量）は単価そのものではなく分類・物理量の参照データのため、他のマスタ同様に全ロール参照可とする。

### 価格マスタの権限と単価計算

価格系マスタは仕入単価そのものであるため、一覧・登録・更新は引き続き管理者のみとする（事務・現場は直接参照できない）。

一方、受注登録では事務ロールが仕入単価を自動計算する必要がある。そこで、**価格マスタの行を取り出す部分だけ** をデータベースの関数にし、**計算は `lib/pricing/` で行う** 役割分担とする。

| 役割 | 担当 | 内容 |
| --- | --- | --- |
| 行の取り出し | DB の関数（`security definer`） | 明細の条件に該当する価格マスタの行だけを返す |
| 単価の計算 | `lib/pricing/`（TypeScript） | 取り出した行から、最新行の選択・エキストラの加算・保証重量の判定などを行う |

DB の関数は `security definer`（関数所有者の権限で実行）とし、関数の中だけ価格マスタを読めるようにする。事務ロールにはこの関数の実行権限だけを付与する。関数は明細 1 行分の条件（種類・材質・板厚・形状・切断方法・切断区分・特殊製品種別・ショットの有無・定尺サイズ・受注日）を受け取り、次の行だけを返す。

- 切断単価（`cutting_prices`）: 種類・切断方法・切断区分・板厚が一致する行。材質指定の行と SS400 ベース（材質 NULL）の行の両方
- 材質エキストラ（`material_extras`）: 指定した材質の行
- 板厚エキストラ・大板加算（`thickness_extras` / `large_plate_extras`）: 指定した板厚の行
- 定尺単価（`standard_plate_prices`）: 種類・材質・板厚・定尺サイズが一致する行
- 特殊製品単価（`special_product_prices`）: 特殊製品種別・種類・ショットの有無・板厚が一致する行

いずれも適用開始日が受注日以前の行に絞って返す。返す形は `lib/pricing` の `PricingMasters`（`lib/pricing/types.ts`）に合わせ、そのまま計算関数に渡せるようにする。複数の行から最新の行を選ぶ処理や、材質指定の行がなければ SS400 ベースの行を使う判断は、`lib/pricing` 側で行う。

これにより、事務ロールは明細の計算に必要な行だけを取得でき、価格マスタの一覧（単価表そのもの）は見られない状態を DB レベルで保証する。計算ルールは `lib/pricing` の 1 か所だけに置くため、SQL へ二重に実装しない。

**関数の仕様**（`supabase/migrations/20260929100300_create_get_pricing_rows_function.sql`）

| 引数 | 型 | 説明 |
| --- | --- | --- |
| `p_plate_type_id` | uuid | 種類（必須） |
| `p_thickness` | numeric | 板厚（必須） |
| `p_as_of` | date | 受注日＝単価の基準日（必須） |
| `p_material_id` | uuid | 材質。無規格（ボンデ・ミガキ）は省略 |
| `p_cutting_method` / `p_cutting_type` | text | 通常の切断・特殊製品で指定 |
| `p_special_product_type_id` | uuid | 特殊製品で指定 |
| `p_has_shot` | boolean | スプライスのショット有無（`orders.splice_shot`）。既定 false |
| `p_plate_size` | text | 定尺売りで指定 |

- 返り値は jsonb（`PricingMasters` と同じ形）
- 関数の中で `current_user_role()` を確認し、office・admin 以外（factory・未ログイン）は例外にする
- 実行権限は `public` と `anon` から外し、`authenticated` にだけ付与する
- アプリからは `lib/pricing/fetch-pricing-masters.ts` の `fetchPricingMasters()` で呼び、戻り値を `calculateCuttingPrice()` などにそのまま渡す

### 列単位のアクセス制御の実装方法

単価情報（`order_items` の `cutting_unit_price` / `sales_unit_price`、`order_item_processes` の `unit_price`）については、現場ロールが参照できないことを DB レベルで保証する。RLS の `USING` / `WITH CHECK` は行単位の制御しかできず列単位のマスキングはできないため、以下の方式を採る。

- 実テーブルへの直接 `select` は office/admin にのみ許可し、factory 向けのポリシーは作らない（ポリシーがない操作は RLS のデフォルトで拒否される）。
- 単価列を除いたビュー（`order_items_factory_view` / `order_item_processes_factory_view`）を作成し、`security_invoker = false`（ビュー所有者の権限で実行）にすることで実テーブルの RLS を越えて中身を読み、単価列だけを除いて返す。factory を含む `authenticated` ロールにはこのビューへの `select` 権限のみを付与する。

**既知の課題: 現場ロール用ビューの列が古い**

2 つのビューは最初の RLS マイグレーション（`20260919130000_create_rls_policies.sql`）で作成したままで、その後に追加・変更された列が反映されていない。

- `order_items_factory_view` に次の列がない: `cutting_type`・`special_product_type_id`・`steel_making`・`plate_size`・`outer_diameter`・`inner_diameter`・`actual_weight`・`material_weight`・`price_unit`
- `order_items_factory_view` の重量の列名が、`square_weight` へのリネーム前の `unit_weight` のまま（ビューはリネーム後の列を指しているが、ビュー上の列名は古い）
- `order_item_processes_factory_view` に `price_unit`（加工の単位）・`spec_fields`（加工の項目）がない

現場ロール（factory）は MVP では運用しないため急ぎではないが、現場用伝票など現場ロールがビューを使う機能を実装する前に、新しいマイグレーションでビューを作り直す。作り直す際も、単価列（`cutting_unit_price`・`sales_unit_price`・加工の `unit_price`）は引き続き除外する。

`orders` の「factory は参照・ステータス更新のみ」も同様に列単位の制御が必要になる。RLS の UPDATE ポリシーは更新前後の行をそれぞれ独立にしか検証できず列同士を比較できないため、`status` 列以外が変更された場合に例外を発生させる `before update` トリガー（`restrict_orders_update_for_factory`）で強制する。

当初は比較する列を 1 つずつ列挙していたが、その後に追加した列（`customer_contact`、スプライス・配達・論理削除の列）が比較から漏れ、現場ロールでも更新できる状態になっていた。今後も列の追加で漏れが起きないよう、`status`（と `updated_at`）以外の行全体を比較する方式に作り直した（`supabase/migrations/20260929100200_restrict_order_deletion_and_factory_updates.sql`）。

ロール判定には `public.users.role` を参照するヘルパー関数 `current_user_role()` を用いる。`users` テーブル自体も RLS 対象であるため、ポリシー評価中に `users` を参照すると RLS ポリシーが再帰的に評価されてしまう。これを避けるため、この関数は `security definer`（関数所有者の権限で実行）として定義し、RLS を経由せずに `role` を読み取る。

実装は `supabase/migrations/20260919130000_create_rls_policies.sql`（orders/order_items/マスタ各種）、`supabase/migrations/20260924100100_create_pricing_tables_rls_policies.sql`（価格系新テーブル）を参照。

### Phase2 での拡張ポイント

**仕入（予定）**

仕入入力の画面（basic-design.md「仕入入力」）のためのテーブルを追加する。テーブルの形は実装時に決めるが、次の情報を持つ。

- 仕入No.（採番する）・仕入日・締日
- どの送り状（または受注）の仕入か。分納のときに送り状ごとに上げるか受注ごとに上げるかは未決事項
- 明細ごとの確定した仕入単価・仕入金額（受注明細の `cutting_unit_price`・加工の行の `unit_price` を確認・修正した値）

制約として、仕入がある送り状は削除できないようにし、送り状がある受注は修正・削除できないようにする（`orders_prevent_deleting_shipped` を広げる）。修正は「仕入を削除 → 送り状を削除 → 受注を修正」の逆順でしか行えない。

**梱包（`packages`）**

製品ラベルは梱包単位（板厚ごと、加工ごと、100 枚を目安に 1 梱包）で発行する。梱包数は例外や現場判断が入るため自動計算せず、手動登録とする想定。

**ミルシート（`mill_sheets`）・商社（`trading_companies`）**

商社はミルシートが届くまで判明しないため、商品マスタではなく取引側に保持する。複数の受注番号をまとめて 1 枚の証明書にする構造のため、受注との関連は N : N になる見込み。

**やり取りの記録（`order_comments`）**

納期変更・注文変更のやり取りを記録する。MVP では納期変更履歴を持たないが、物件（工事名）単位の工程一覧を実装する際に、備考またはチャット形式で一体的に設計する。

**在庫連携**

既存の在庫管理 Excel は「材質 × 板厚」でシートを分け、内部でメーカー別に在庫を管理している。`products` の粒度（材質 × 板厚 × 形状）と整合するため、材質・板厚で照合すれば「SS400 22mm が在庫薄」といった表示を実現できる。メーカー指定がある受注では、指定メーカーに絞った在庫を表示する。

**拠点間の横持ち**

複数拠点を持つ事業所では、拠点間で材料を移動する「横持ち」が発生する。MVP では加工場所（営業所）を受付・受注に持つが、拠点間の材料の移動は扱わない。拠点間連携を実装する際は出荷実績に発地・着地の情報が必要になる。
