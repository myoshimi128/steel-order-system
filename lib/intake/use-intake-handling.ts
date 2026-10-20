'use client'

// 受付待ちの受付を開いている間、自分を「対応中の人」にするカスタムフック
// （docs/intake/screen-design.md「S-04a」の対応中の表示）。
//
//   ・intakeId が決まったら、DB の claim_intake で自分を対応中にする（ほかの人が 30 分以内に開いていたら変えない）
//   ・別の受付に移った・画面を閉じたら、release_intake で外す
//   ・結果として「今の対応中の人」を返す。ほかの人なら、画面に「○○さんが対応中」と出す
// 受付待ちでない受付（受付登録済など）は intakeId に null を渡す（対応中の表示は受付待ちだけ）。
//
// ブラウザのタブを閉じたときは外せないことがあるが、開始から 30 分で無効とみなすため、表示は残り続けない。

import { useEffect, useState } from 'react'
import { claimIntake, releaseIntake } from '@/app/(main)/intake/actions'

export type ClaimResult = {
  intakeId: string
  handlingBy: string | null
  handlingByName: string | null
}

export function useIntakeHandling(intakeId: string | null): ClaimResult | null {
  const [result, setResult] = useState<ClaimResult | null>(null)

  useEffect(() => {
    if (intakeId === null) return
    let cancelled = false

    void claimIntake(intakeId).then((response) => {
      if (cancelled) return
      if (response.ok) {
        setResult({ intakeId, handlingBy: response.handlingBy, handlingByName: response.handlingByName })
      } else {
        console.error(response.error)
      }
    })

    return () => {
      cancelled = true
      void releaseIntake(intakeId)
    }
  }, [intakeId])

  // 別の受付に移った直後は、前の受付の結果を返さない
  return result !== null && result.intakeId === intakeId ? result : null
}
