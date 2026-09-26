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
| `notices` | 注意事項。得意先・加工種別・その組み合わせに紐づく |
| `stamps` | 現場用伝票に印字するスタンプ文言 |
| `customer_stamps` | 得意先ごとに既定でチェックするスタンプ |
| `users` | ユーザー。ロールを含む |

### トランザクション系

| テーブル | 内容 |
| --- | --- |
| `orders` | 受注ヘッダー |
| `order_items` | 受注明細（材料） |
| `order_item_processes` | 加工明細（材料に紐づく加工） |
| `shipments` | 出荷実績 |
| `shipment_items` | 出荷明細 |
| `attachments` | 添付ファイル（注文書 PDF・DXF） |
| `order_stamps` | 受注に付けたスタンプ |

### Phase2 で追加予定

`packages`（梱包）、`mill_sheets`（ミルシート）、`trading_companies`（商社）、`carriers`（運送会社）、`work_locations`（加工場所）、`order_comments`（納期変更・注文変更のやり取り）

## マスタテーブル定義

### customers（得意先）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `code` | text | 得意先コード（例: T04500） |
| `name` | text | 得意先名 |
| `contact_person` | text | 客先担当 |
| `is_active` | boolean | 有効フラグ |
| `created_at` / `updated_at` | timestamptz |  |

注意事項は `notices` テーブルに切り出す。得意先マスタ内のテキスト欄として持つと、その受注に関係のない注意事項まですべて表示され、件数が増えるにつれ読み飛ばされるためである。

### delivery\_destinations（納入先）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `code` | text | 納入先コード |
| `name` | text | 納入先名 |
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
| `is_active` | boolean | 有効フラグ |

材質ラインは材質ごとに色と本数が決まっているため、マスタに登録して現場用伝票に印字する。「材質ライン要」とだけ印字するのではなく「材質ライン：青2本」のように具体的な指示を出すことで、現場が別途確認する手間をなくす。

基本材質（SS400）は `line_mark` と `display_color` を NULL とする。印刷処理では材質名を条件分岐せず、`line_mark` が登録されていれば印字するという判定のみを行う。材質が増えた場合もマスタに 1 行追加すれば対応できる。

`has_dedicated_price` は、切断単価の材質選択（マスタ管理画面のプルダウン）を「専用単価を持つ材質のみ」に絞り込むために使う。専用単価を持たない材質は SS400 ベースの単価に材質エキストラを加算して求めるため、プルダウンには出さない。

`name` に一意制約を設ける。

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

縞板・ボンデ・ミガキは種類固有の単価を持ち、材質エキストラを適用しない。ボンデ・ミガキは無規格のため材質を持たない。

`name` に一意制約を設ける。

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

### special\_product\_types（特殊製品種別）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `name` | text | スプライス / ササラ / ベタ丸 / ドーナツ |
| `weight_basis` | text | 実重量 / 角重量 / 使用材重量 |
| `min_weight` | numeric | 最低保証重量（スプライスは 3、他は NULL） |
| `applies_thickness_extra` | boolean | 板厚エキストラを適用するか |
| `applies_large_plate_extra` | boolean | 大板加算を適用するか |
| `always_piece_price` | boolean | 常に枚単価で表示するか（ベタ丸・ドーナツ） |
| `is_active` | boolean | 有効フラグ |

`name` に一意制約を設ける。

### special\_product\_prices（特殊製品単価）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `special_product_type_id` | uuid | FK → `special_product_types` |
| `plate_type_id` | uuid | FK → `plate_types` |
| `has_shot` | boolean | ショット加工の有無（スプライスのみ使用） |
| `thickness_min` / `thickness_max` | numeric | 板厚区分 |
| `unit_price` | numeric | kg 単価 |
| `valid_from` | date | 適用開始日 |

スプライスは切断・キリ孔・ショットを含むセット価格のため、切断方法によって単価が変わらない。ササラ・ベタ丸・ドーナツも同様に切断方法に依存しない。

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
| `is_active` | boolean | 有効フラグ |

注意事項は `notices` テーブルに切り出す。

`category` はショット加工量明細のような集計に使用する。

### manufacturers（メーカー）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `code` | text | メーカーコード（例: 220、230） |
| `name` | text | メーカー名（メーカーA、メーカーB、メーカーC など） |
| `is_active` | boolean | 有効フラグ |

### users（ユーザー）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK。Supabase Auth の user id |
| `employee_no` | text | 社員番号 |
| `name` | text | 氏名 |
| `role` | text | ロール。`office` / `factory` / `admin` |
| `is_active` | boolean | 有効フラグ |

`factory`（現場）は MVP では運用しないが、ロールの枠組みとして定義しておく。

### notices（注意事項）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `customer_id` | uuid | FK → `customers`。NULL 可 |
| `process_type_id` | uuid | FK → `process_types`。NULL 可 |
| `body` | text | 注意事項の本文 |
| `priority` | integer | 表示順 |
| `is_active` | boolean | 有効フラグ |

得意先・加工種別のどちらを埋めるかで表示条件が決まる。

| `customer_id` | `process_type_id` | 表示条件 |
| --- | --- | --- |
| あり | NULL | その得意先の受注すべてで表示 |
| NULL | あり | その加工を選択したときすべてで表示 |
| あり | あり | その得意先かつその加工のときのみ表示 |

「A 社はレーザー加工のときだけ注意」と「A 社は常に精度に厳しい」を同一の仕組みで扱える。両方が NULL の行は作らない（チェック制約で禁止する）。

注意事項を独立したテーブルとするのは、受注に関係のないものまで表示すると件数が増えるにつれ読み飛ばされ、注意喚起として機能しなくなるためである。条件付きの内容（板厚 9mm 以下なら可、など）は自動判定せずテキストとして表示する。

### stamps（スタンプ文言）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `body` | text | 文言（雨濡れ厳禁 など） |
| `display_order` | integer | 表示順 |
| `is_active` | boolean | 有効フラグ |

現場用伝票に印字する文言を登録しておき、受注入力時にチェックしたものを伝票に反映する。

同じ文言を複数の得意先が指定するため、得意先との関連は `customer_stamps` で保持する。

### customer\_stamps（得意先の既定スタンプ）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `customer_id` | uuid | FK → `customers` |
| `stamp_id` | uuid | FK → `stamps` |

ここに登録された文言は、その得意先の受注入力時に初期状態でチェックが入る。客先指定の文言を毎回選ぶ必要がなくなる。

`customer_id` + `stamp_id` に一意制約を設ける。

## トランザクションテーブル定義

### orders（受注ヘッダー）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `order_no` | text | 受注番号。自動採番 |
| `order_date` | date | 受注日 |
| `customer_id` | uuid | FK → `customers` |
| `delivery_destination_id` | uuid | FK → `delivery_destinations` |
| `project_name` | text | 工事名 |
| `due_date_type` | text | 納期種別。`確定` / `仮納期` / `後報` / `最短出荷` |
| `due_date` | date | 納期。`後報` `最短出荷` では NULL |
| `status` | text | `加工待ち` / `出荷待ち` / `配送依頼済み` / `完了` |
| `created_by` | uuid | FK → `users`。起案者 |
| `remarks` | text | 摘要 |
| `field_note` | text | 現場用伝票に印字するフリーコメント |
| `created_at` / `updated_at` | timestamptz |  |

ステータスは受注ヘッダーに 1 つ持つ。実務では同一受注内の明細がまとめて加工・出荷されるため、明細単位の管理は行わない。

納期は種別と日付の 2 つで保持する。日付の有無だけでは `後報`（待ち）と `最短出荷`（急ぎ）を区別できないためである。

### order\_items（受注明細）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `order_id` | uuid | FK → `orders` |
| `line_no` | integer | 行番号 |
| `product_id` | uuid | FK → `products` |
| `cutting_method` | text | 切断方法。`シャーリング` / `ガス` / `レーザー` / `プラズマ`。`cutting_prices.cutting_method` と同じ値域。定尺売りの場合は NULL |
| `cutting_type` | text | 寸法切 / アイトレ |
| `special_product_type_id` | uuid | 特殊製品の場合に指定。通常の切断は NULL |
| `steel_making` | text | 電炉材 / 高炉材。受注時に確定し、後から変更可 |
| `width` | numeric | 巾（mm） |
| `length` | numeric | 長さ（mm） |
| `outer_diameter` | numeric | 外径（mm）。ベタ丸・ドーナツで使用 |
| `inner_diameter` | numeric | 内径（mm）。ドーナツで使用 |
| `quantity` | integer | 数量 |
| `square_weight` | numeric | 角重量（1 枚あたり kg）。単価計算の根拠 |
| `actual_weight` | numeric | 実重量（1 枚あたり kg）。配送依頼用。アイトレは手入力 |
| `material_weight` | numeric | 使用材の重量（kg）。ササラで手入力 |
| `cutting_unit_price` | numeric | 切断単価（各エキストラ加算後）。マスタから自動計算 |
| `sales_unit_price` | numeric | 売上単価 |
| `price_unit` | text | kg / 枚。角重量から自動判定（ベタ丸・ドーナツは常に枚） |
| `manufacturer_specified_id` | uuid | FK → `manufacturers`。メーカー指定。NULL 可 |
| `manufacturer_used_id` | uuid | FK → `manufacturers`。使用メーカー。加工時に入力 |
| `mill_sheet_no` | text | ミルシート番号。加工時に入力 |
| `package_count` | integer | 梱包数。製品ラベルの印刷枚数。入力者が手入力 |
| `remarks` | text | 備考 |
| `field_note` | text | この明細だけに適用するフリーコメント |

メーカーは「指定」と「実績」で確定タイミングが異なるため別カラムとする。同一カラムで兼ねると、指定のない受注に実績が入った際に客先指定があったように見えてしまう。縞板のみ、縞目の見た目が異なるため受注時に客先へ確認しており、`manufacturer_specified_id` が単位質量の参照にも使われる。

重量は角重量と実重量を分けて保持する。請求は角重量で行い（材料としては四角で消費するため）、配送依頼には実重量を用いる。寸法切は両者が一致し、アイトレは実重量を手入力、ベタ丸・ドーナツは外径・内径から両方を算出する。

`price_unit` は 1 枚あたりの角重量から自動判定する。1.5kg 未満・2kg 未満はいずれも枚単価となり、kg 単価に最低保証重量を掛けて算出する。

### order\_item\_processes（加工明細）

| カラム | 型 | 説明 |
| --- | --- | --- |
| `id` | uuid | PK |
| `order_item_id` | uuid | FK → `order_items` |
| `line_no` | integer | 行番号 |
| `process_type_id` | uuid | FK → `process_types` |
| `spec` | text | 加工内容（例: キリ孔 1S/12 孔 38φ） |
| `quantity` | integer | 加工数量 |
| `unit_price` | numeric | 加工単価。MVP では手入力 |
| `remarks` | text | 備考 |

1 つの材料に複数の加工（穴あけ + 曲げ + ショット）が付くケースを表現するため、受注明細の子テーブルとする。加工指示書では加工が重量ゼロの別行として印字されるが、これは材料重量を二重に計上しないための表示上の処理である。

重量建てで加工賃が決まる加工があるが、その重量は材料の重量と一致するため、加工明細に重量カラムは持たない。親の `order_items.unit_weight` を参照して算出する。同じ値を 2 箇所に保持すると、寸法修正時にずれる原因となる。

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

### attachments（添付ファイル）

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
customers ──┐
            ├─< orders ──< order_items ──< order_item_processes
delivery_   ┘      │            │                    │
destinations       │            │                    └── process_types
                   │            ├── products ──> plate_types / materials
                   │            ├── manufacturers （指定 / 実績の2方向）
                   │            └── special_product_types
                   │
                   ├─< shipments ──< shipment_items ──> order_items
                   ├─< attachments
                   ├─< order_stamps ──> stamps
                   └── users （created_by）

customers ──< customer_stamps >── stamps
notices   ──> customers / process_types （どちらか、または両方）

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
| `orders` | `attachments` | 1 : N | 注文書 PDF・DXF |

### 参照の考え方

価格系テーブル（`cutting_prices` `standard_plate_prices` `special_product_prices` `material_extras` `thickness_extras` `large_plate_extras` `unit_weights`）は `products` への外部キーを持たず、種類・材質・板厚などの値で照合する。単価は切断方法や特殊製品種別など商品以外の条件も含むため、商品と 1 対 1 で対応しないためである。

`order_items` は `manufacturers` を 2 方向から参照する。`manufacturer_specified_id`（受注時の客先指定）と `manufacturer_used_id`（加工時の実績）は性質が異なるため、別々の外部キーとして持つ。

## 設計上の補足

### 計算で求める項目

以下はカラムとして保持せず、必要時に算出する。保存すると元データの修正時に古い値が残り、整合性が崩れるためである。

| 項目 | 算出方法 |
| --- | --- |
| 残数量 | 受注数量 − 出荷実績の合計 |
| 重量区分 | 単位重量が 2kg 以下かで判定 |
| 明細金額 | 単価 × 数量 |
| 受注合計 | 明細金額の合計 |

角重量・実重量は寸法と材質（縞板は単位質量）から算出できるため、入力者に選択させず自動計算する。ただしアイトレの実重量とササラの使用材重量は形状が一定でないため手入力とする。

重量は小数第 2 位まで保持し、各段階で四捨五入する。切り捨ては行わない。合計重量は 1 枚あたりの重量に枚数を掛けた後に丸める。

### 制約

- `products` の `plate_type_id` + `material_id` + `thickness` + `shape` に一意制約
- 価格系テーブル（`cutting_prices` `standard_plate_prices` `special_product_prices` など）は、それぞれの条件の組み合わせに一意制約（`valid_from` を含む）。詳細は各テーブルの説明を参照
- `material_extras.material_id` に一意制約（材質ごとに1行）
- `plate_types` `materials` `special_product_types` は `name` に一意制約
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
| `attachments` | 参照・登録・更新 | 参照不可 | すべて |
| `order_stamps` | 参照・登録・更新 | 参照 | すべて |
| `users` | 参照 | 参照 | すべて |
| 価格系マスタ（`cutting_prices` `material_extras` `thickness_extras` `large_plate_extras` `standard_plate_prices` `special_product_prices`） | 参照不可 | 参照不可 | すべて |
| マスタ各種（`plate_types` `special_product_types` `unit_weights` を含む） | 参照 | 参照 | すべて |

`order_item_processes` / `shipments` / `shipment_items` / `attachments` / `order_stamps` / `users` は元の設計時点では個別に定めていなかったテーブルである。`orders` `order_items` `マスタ各種` に適用した考え方（現場の業務範囲は「加工指示の閲覧」に限られる、単価情報は現場に見せない）を、各テーブルの性質に当てはめて追加した。

- `order_item_processes` の `unit_price`（加工単価）は `order_items` の単価列と同じ性質の情報のため、同様に現場からは隠す。
- `shipments` / `shipment_items`（送り状）と `attachments`（注文書ファイル）は、送り状発行・ファイル管理のいずれも事務の業務であり現場の業務範囲に含まれないため、現場は参照不可とする。
- `order_stamps` は現場用伝票にそのまま印字される内容であり、単価情報のような機密性もないため、現場にも参照を許可する。
- `users` は起案者・出荷担当者などの氏名表示にどのロールからも参照できる必要があるため参照は全ロールに許可し、登録・更新は管理者のみとする。
- 価格体系の再設計（切断単価・各種エキストラ・定尺単価・特殊製品単価）により `prices` は廃止されたが、単価情報を現場に見せないという方針自体は変わらないため、価格系の新テーブルすべてに同じ制限を引き継ぐ。`plate_types`（種類）・`special_product_types`（特殊製品種別）・`unit_weights`（単位質量）は単価そのものではなく分類・物理量の参照データのため、他のマスタ同様に全ロール参照可とする。

### 列単位のアクセス制御の実装方法

単価情報（`order_items` の `cutting_unit_price` / `sales_unit_price`、`order_item_processes` の `unit_price`）については、現場ロールが参照できないことを DB レベルで保証する。RLS の `USING` / `WITH CHECK` は行単位の制御しかできず列単位のマスキングはできないため、以下の方式を採る。

- 実テーブルへの直接 `select` は office/admin にのみ許可し、factory 向けのポリシーは作らない（ポリシーがない操作は RLS のデフォルトで拒否される）。
- 単価列を除いたビュー（`order_items_factory_view` / `order_item_processes_factory_view`）を作成し、`security_invoker = false`（ビュー所有者の権限で実行）にすることで実テーブルの RLS を越えて中身を読み、単価列だけを除いて返す。factory を含む `authenticated` ロールにはこのビューへの `select` 権限のみを付与する。

`orders` の「factory は参照・ステータス更新のみ」も同様に列単位の制御が必要になる。RLS の UPDATE ポリシーは更新前後の行をそれぞれ独立にしか検証できず列同士を比較できないため、`status` 列以外が変更された場合に例外を発生させる `before update` トリガー（`restrict_orders_update_for_factory`）で強制する。

ロール判定には `public.users.role` を参照するヘルパー関数 `current_user_role()` を用いる。`users` テーブル自体も RLS 対象であるため、ポリシー評価中に `users` を参照すると RLS ポリシーが再帰的に評価されてしまう。これを避けるため、この関数は `security definer`（関数所有者の権限で実行）として定義し、RLS を経由せずに `role` を読み取る。

実装は `supabase/migrations/20260919130000_create_rls_policies.sql`（orders/order_items/マスタ各種）、`supabase/migrations/20260924100100_create_pricing_tables_rls_policies.sql`（価格系新テーブル）を参照。

### Phase2 での拡張ポイント

**梱包（`packages`）**

製品ラベルは梱包単位（板厚ごと、加工ごと、100 枚を目安に 1 梱包）で発行する。梱包数は例外や現場判断が入るため自動計算せず、手動登録とする想定。

**ミルシート（`mill_sheets`）・商社（`trading_companies`）**

商社はミルシートが届くまで判明しないため、商品マスタではなく取引側に保持する。複数の受注番号をまとめて 1 枚の証明書にする構造のため、受注との関連は N : N になる見込み。

**やり取りの記録（`order_comments`）**

納期変更・注文変更のやり取りを記録する。MVP では納期変更履歴を持たないが、物件（工事名）単位の工程一覧を実装する際に、備考またはチャット形式で一体的に設計する。

**在庫連携**

既存の在庫管理 Excel は「材質 × 板厚」でシートを分け、内部でメーカー別に在庫を管理している。`products` の粒度（材質 × 板厚 × 形状）と整合するため、材質・板厚で照合すれば「SS400 22mm が在庫薄」といった表示を実現できる。メーカー指定がある受注では、指定メーカーに絞った在庫を表示する。

**拠点間の横持ち**

複数拠点を持つ事業所では、拠点間で材料を移動する「横持ち」が発生する。MVP は単一拠点の鋼板切断部門に閉じているため扱わないが、拠点間連携を実装する際は出荷実績に発地・着地の情報が必要になる。
