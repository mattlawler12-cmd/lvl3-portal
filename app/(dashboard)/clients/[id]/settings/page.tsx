import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientSettingsPage({ params }: Props) {
  const { id } = await params
  redirect(`/clients/${id}`)
}
