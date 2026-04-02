import { requireAdmin } from '@/lib/auth'
import TfkGeneratorClient from './TfkGeneratorClient'

export default async function TfkGeneratorPage() {
  await requireAdmin()
  return <TfkGeneratorClient />
}
