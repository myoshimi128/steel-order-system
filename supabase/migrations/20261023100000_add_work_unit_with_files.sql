-- 受注登録待ちに追加（S-06b）で使う関数（docs/intake/table-design.md「関数」、docs/intake/screen-design.md「S-06b」）。
--
--   ・add_work_unit_with_files(intake_id, kind, origin, note, files)
--       振り分けの見落とし・口頭での追加注文などで、振り分け完了後の受付に加工区分を 1 つ足し、
--       一緒に入れた図面・注文書（PDF・DXF。kind = 'added'）の行を作る。加工区分とファイルの行を 1 つの transaction で作る
--
-- 今ある add_work_unit（20261018100200_create_intake_functions.sql）は加工区分だけを作る。
-- 区分を先に作ってからファイルを入れると、ファイルを入れられなかったときに、後からその区分にファイルを足す画面がない。
-- そのため、ほかの画面と同じく「ファイルの実物を Storage に置く → 区分とファイルの行をまとめて作る」の順にし、
-- 行を作れなかったら、画面が置いた実物を消す。
--
-- 区分の状態は、今あるトリガー（work_units_before_write）が入れる（先寸は ready ＝受注登録待ち、アイトレは cad_waiting ＝CAD）。
-- 受付が完了（closed）なら、振り分け完了（dispatched）に戻す（add_work_unit と同じ）。
--
-- 関数は security invoker（呼び出したユーザーの権限で実行）にして RLS をそのまま効かせ、ロールは関数の中でも確かめる。
-- エラーの文の先頭の INTAKE_NOT_DISPATCHED は、画面がエラーの種類を見分けるための印
-- （振り分けがまだ終わっていない受付 → 振り分けの画面へのリンクを出す）。
--
-- 実行の手順:
--   1. SQL Editor でこのファイルを実行する
--   2. npm run db:types で型を再生成する（関数の型は、生成と同じ形で lib/database.types.ts に先に入れてある）
--   テーブルは増えないため、Data API の設定画面での確認は不要


-- p_files は、ファイルの情報の配列（json）。
--   [{ "id": "…", "original_name": "追加_リブPL.pdf", "storage_path": "{受付の id}/{id}.pdf",
--      "mime_type": "application/pdf", "size_bytes": 12345 }, …]
-- 図面・注文書は任意のため、空の配列でもよい
create or replace function public.add_work_unit_with_files(
  p_intake_id uuid,
  p_kind text,
  p_origin text,
  p_note text,
  p_files jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_unit_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_file jsonb;
  v_file_id uuid;
  v_path text;
begin
  if public.current_user_role() is distinct from 'office'
     and public.current_user_role() is distinct from 'admin' then
    raise exception '受注登録待ちに追加できるのは事務・管理者だけです';
  end if;
  if p_kind not in ('sakisun', 'aitore') then
    raise exception '区分を選んでください';
  end if;
  -- 振り分け（split）は振り分け完了で作られる区分のため、追加では使わない
  if p_origin not in ('oversight', 'verbal', 'other') then
    raise exception '追加の理由を選んでください';
  end if;
  -- 「その他」は、何のための追加かが分かるようにメモを必須にする
  if p_origin = 'other' and v_note is null then
    raise exception '追加の理由が「その他」のときは、メモを入力してください';
  end if;
  if jsonb_typeof(coalesce(p_files, '[]'::jsonb)) <> 'array' then
    raise exception 'ファイルの情報が正しくありません';
  end if;

  -- 受付の行をロックして、ほかの人の追加・削除と同時に動かないようにする
  select status into v_status
  from public.intakes
  where id = p_intake_id and deleted_at is null
  for update;
  if v_status is null then
    raise exception '受付が見つかりません';
  end if;
  if v_status not in ('dispatched', 'closed') then
    raise exception 'INTAKE_NOT_DISPATCHED: 振り分けが終わっていない受付には追加できません (状態=%)', v_status;
  end if;

  -- 状態は省略して、トリガーに入れてもらう（先寸は ready、アイトレは cad_waiting）
  insert into public.work_units (intake_id, kind, origin, note)
  values (p_intake_id, p_kind, p_origin, v_note)
  returning id into v_unit_id;

  -- jsonb_array_elements は、json の配列を 1 要素ずつの行にする
  for v_file in select * from jsonb_array_elements(coalesce(p_files, '[]'::jsonb))
  loop
    v_file_id := (v_file ->> 'id')::uuid;
    v_path := v_file ->> 'storage_path';
    -- 置き場所は「受付の id/ファイルの id.拡張子」の形に限る（ほかの受付の置き場所を指せないように）
    if v_path is null or v_path not like p_intake_id::text || '/' || v_file_id::text || '%' then
      raise exception 'ファイルの置き場所が正しくありません';
    end if;

    insert into public.intake_files (id, intake_id, work_unit_id, kind, original_name, storage_path, mime_type, size_bytes)
    values (
      v_file_id,
      p_intake_id,
      v_unit_id,
      'added',
      v_file ->> 'original_name',
      v_path,
      v_file ->> 'mime_type',
      (v_file ->> 'size_bytes')::bigint
    );
  end loop;

  update public.intakes set status = 'dispatched' where id = p_intake_id and status = 'closed';

  return v_unit_id;
end;
$$;

comment on function public.add_work_unit_with_files(uuid, text, text, text, jsonb) is
  '受注登録待ちに追加（見落とし・口頭など）。加工区分と、一緒に入れた図面・注文書（kind = added）の行を 1 つの transaction で作る。振り分け完了後のみ。closed の受付は dispatched に戻す。';


-- 実行の権限: 作った時点で public（全員）に付くため、外してから authenticated にだけ付ける
revoke execute on function public.add_work_unit_with_files(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.add_work_unit_with_files(uuid, text, text, text, jsonb) to authenticated;
