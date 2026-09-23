import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { DeliveryDestinationForm } from '../delivery-destination-form'

// 納入先の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditDeliveryDestinationPage(
  props: PageProps<'/masters/delivery-destinations/[id]'>
) {
  const { id } = await props.params
  const user = await getCurrentUser()

  if (user?.role !== 'admin') {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          この操作を行う権限がありません。
        </p>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: destination } = await supabase
    .from('delivery_destinations')
    .select('id, code, name, address, area, is_active')
    .eq('id', id)
    .single()

  if (!destination) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">納入先の編集</h1>
      <DeliveryDestinationForm mode="edit" destination={destination} />
    </main>
  )
}
