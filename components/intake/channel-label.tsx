// 受付の経路の印（メール・FAX・口頭・電話など）。一覧の列「経路」に出す。

import { Icon } from '@/components/layout/icon'
import { INTAKE_CHANNEL_LABELS, type IntakeChannel } from '@/lib/intake/constants'

export function ChannelLabel({ channel }: { channel: IntakeChannel }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-canvas px-1.5 py-0.5 text-xs text-neutral-600">
      {channel === 'mail' && <Icon name="mail" className="h-3.5 w-3.5" />}
      {INTAKE_CHANNEL_LABELS[channel]}
    </span>
  )
}
