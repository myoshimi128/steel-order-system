'use client'

// 明細の仕入単価の計算に使う価格マスタの行を、行ごとに取得するカスタムフック。
//
// 取得のタイミング:
//   ・行の入力から「価格マスタの行を取得する条件」（種類・材質・板厚・切断方法・区分・定尺サイズ・受注日）が
//     決まったら、少し待ってから（入力の途中で何度も取得しないよう 0.3 秒）Server Action で取得する
//   ・取得結果は条件ごとに保存し、同じ条件の行では取得し直さない
//     （同じ材質・板厚の行が何十行も続いても、取得は 1 回で済む）
//   ・寸法・数量は条件に含めないため、寸法や数量を変えただけなら取得し直さない
//     （重量・単価の計算は、取得済みの行を使って画面側の lib/pricing で行う）

import { useEffect, useRef, useState } from 'react'
import { fetchPricingRows } from '@/app/orders/new/actions'
import type { PricingRowConditions } from '@/lib/pricing/fetch-pricing-masters'
import type { PricingMasters } from '@/lib/pricing/types'
import { pricingConditionsKey } from './calculate-item'

// 入力が落ち着いてから取得するまでの待ち時間（ミリ秒）
const FETCH_DELAY_MS = 300

type CacheEntry = { status: 'loaded'; masters: PricingMasters } | { status: 'error'; message: string }

export function useItemPricing(conditionsList: readonly (PricingRowConditions | null)[]) {
  const [cache, setCache] = useState<Record<string, CacheEntry>>({})
  // 取得中の条件（同じ条件を二重に取得しないため）
  const inFlightRef = useRef(new Set<string>())

  // 画面にある行の条件（重複を除く）。キーの一覧を文字列にして、変わったときだけ取得を始める
  const conditionsByKey = new Map<string, PricingRowConditions>()
  for (const conditions of conditionsList) {
    if (conditions) {
      conditionsByKey.set(pricingConditionsKey(conditions), conditions)
    }
  }
  // まだ結果がない条件のキー（取得中のものも含む。取得中かどうかは effect の中で確認する）
  const missingKeys = [...conditionsByKey.keys()].filter((key) => !(key in cache))
  const missingSignature = missingKeys.join('\n')

  useEffect(() => {
    if (!missingSignature) {
      return
    }
    const keys = missingSignature.split('\n')
    const timer = setTimeout(() => {
      for (const key of keys) {
        const conditions = conditionsByKey.get(key)
        if (!conditions || inFlightRef.current.has(key)) {
          continue
        }
        inFlightRef.current.add(key)
        fetchPricingRows(conditions)
          .then((result) => {
            setCache((current) => ({
              ...current,
              [key]: result.ok
                ? { status: 'loaded', masters: result.masters }
                : { status: 'error', message: result.message },
            }))
          })
          .finally(() => {
            inFlightRef.current.delete(key)
          })
      }
    }, FETCH_DELAY_MS)
    // 待っている間に入力が変わったら、前の予約は取り消す（最新の条件だけを取得する）
    return () => clearTimeout(timer)
    // conditionsByKey は描画ごとに作り直すため依存配列に入れず、取得が必要なキーの一覧だけで判定する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingSignature])

  // 条件に対応する取得結果（未取得・取得中なら undefined）
  function mastersFor(conditions: PricingRowConditions | null): PricingMasters | undefined {
    if (!conditions) {
      return undefined
    }
    const entry = cache[pricingConditionsKey(conditions)]
    return entry?.status === 'loaded' ? entry.masters : undefined
  }

  // 取得に失敗した場合のメッセージ
  function errorFor(conditions: PricingRowConditions | null): string | undefined {
    if (!conditions) {
      return undefined
    }
    const entry = cache[pricingConditionsKey(conditions)]
    return entry?.status === 'error' ? entry.message : undefined
  }

  return { mastersFor, errorFor }
}
