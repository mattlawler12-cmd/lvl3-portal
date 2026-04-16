import { requireAdmin } from '@/lib/auth'
import { resolveSelectedClientId } from '@/lib/client-resolution'
import { TOOLS } from '@/lib/tools/registry'
import ToolsHubClient from '@/components/tools/ToolsHubClient'

export default async function ToolsPage() {
  const { user } = await requireAdmin()
  const selectedClientId = await resolveSelectedClientId(user)

  // Serialize manifests for the client (strip icon component — not serializable)
  const toolData = TOOLS.map(t => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    category: t.category,
    tags: t.tags,
    inputType: t.inputType,
    dataSources: t.dataSources,
    access: t.access,
    status: t.status,
    persistsRuns: t.persistsRuns,
    estimatedRuntime: t.estimatedRuntime,
    route: t.route,
  }))

  return (
    <ToolsHubClient
      tools={toolData}
      selectedClientId={selectedClientId}
    />
  )
}
