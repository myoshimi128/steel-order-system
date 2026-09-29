import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '@/lib/database.types'
import { fetchPricingMasters, toPricingMasters } from './fetch-pricing-masters'
import { MASTERS } from './test-fixtures'

// rpc だけを持つモックの Supabase クライアントを作る
function mockClient(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result)
  const client = { rpc } as unknown as SupabaseClient<Database>
  return { client, rpc }
}

describe('fetchPricingMasters', () => {
  it('条件を get_pricing_rows の引数に変換して呼び、PricingMasters を返す', async () => {
    const { client, rpc } = mockClient({ data: MASTERS, error: null })

    const masters = await fetchPricingMasters(client, {
      plateTypeId: 'plate-normal',
      materialId: 'mat-sn400b',
      thickness: 9,
      asOf: '2026-06-01',
      cuttingMethod: 'レーザー',
      cuttingType: '寸法切',
    })

    expect(rpc).toHaveBeenCalledWith('get_pricing_rows', {
      p_plate_type_id: 'plate-normal',
      p_thickness: 9,
      p_as_of: '2026-06-01',
      p_material_id: 'mat-sn400b',
      p_cutting_method: 'レーザー',
      p_cutting_type: '寸法切',
      p_special_product_type_id: undefined,
      p_has_shot: false,
      p_plate_size: undefined,
    })
    expect(masters).toEqual(MASTERS)
  })

  it('null の条件は省略（undefined）として渡す（DB 側の既定値 NULL を使う）', async () => {
    const { client, rpc } = mockClient({ data: MASTERS, error: null })

    await fetchPricingMasters(client, {
      plateTypeId: 'plate-bonde',
      materialId: null,
      thickness: 1.6,
      asOf: '2026-06-01',
      plateSize: '3x6',
    })

    const args = rpc.mock.calls[0][1]
    expect(args.p_material_id).toBeUndefined()
    expect(args.p_plate_size).toBe('3x6')
  })

  it('スプライスのショット有無を渡す', async () => {
    const { client, rpc } = mockClient({ data: MASTERS, error: null })

    await fetchPricingMasters(client, {
      plateTypeId: 'plate-normal',
      materialId: 'mat-ss400',
      thickness: 12,
      asOf: '2026-06-01',
      specialProductTypeId: 'sp-splice',
      hasShot: true,
    })

    const args = rpc.mock.calls[0][1]
    expect(args.p_special_product_type_id).toBe('sp-splice')
    expect(args.p_has_shot).toBe(true)
  })

  it('関数がエラーを返したら例外にする（事務・管理者以外が呼んだ場合など）', async () => {
    const { client } = mockClient({
      data: null,
      error: { message: '価格マスタの行を取得する権限がありません' },
    })

    await expect(
      fetchPricingMasters(client, { plateTypeId: 'x', thickness: 9, asOf: '2026-06-01' }),
    ).rejects.toThrow('権限がありません')
  })
})

describe('toPricingMasters', () => {
  it('6 種類の配列がそろっていればそのまま返す', () => {
    expect(toPricingMasters(MASTERS)).toBe(MASTERS)
  })

  it('配列が欠けている・形式が違う場合は、誤った単価を出さないよう例外にする', () => {
    // standardPlatePrices だけを取り除いたオブジェクト
    const missing: Record<string, unknown> = { ...MASTERS }
    delete missing.standardPlatePrices
    expect(() => toPricingMasters(missing)).toThrow('standardPlatePrices')
    expect(() => toPricingMasters(null)).toThrow()
    expect(() => toPricingMasters('[]')).toThrow()
  })
})
