import { requireAuth } from '@/lib/auth'
import { getSelectedClientId, getClientById } from '@/lib/client-resolution'
import { getSheetData } from '@/app/actions/projects'
import ProjectsView from '@/components/projects/projects-view'
import { FileSpreadsheet } from 'lucide-react'

export default async function ProjectsPage() {
  const { user } = await requireAuth()

  type ClientRow = { id: string; name: string; google_sheet_id: string | null }

  const selectedClientId = user.role === 'client'
    ? user.client_id
    : await getSelectedClientId()

  const selectedClient = selectedClientId
    ? await getClientById<ClientRow>(selectedClientId, 'id, name, google_sheet_id')
    : null

  const showSelector = user.role === 'admin' || user.role === 'member'
  const isAdmin = user.role === 'admin'

  // ── Fetch sheet data if a client is selected and has a sheet ────────────────

  const sheetId = selectedClient?.google_sheet_id ?? null
  let sheetData: { rows: import('@/app/actions/projects').SheetRow[]; fetchedAt: string } | null = null
  let sheetError: string | null = null

  if (sheetId) {
    try {
      sheetData = await getSheetData(sheetId)
    } catch (err) {
      sheetError = err instanceof Error ? err.message : String(err)
      console.error('[projects] sheet fetch error:', err)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        <p className="mt-1 text-zinc-400 text-sm">
          {selectedClient ? selectedClient.name : 'Track your active project tasks.'}
        </p>
      </div>

      {/* Content */}
      {!selectedClient && showSelector ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileSpreadsheet className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-zinc-400">Select a client from the sidebar to view their project tracker.</p>
        </div>
      ) : !selectedClient ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileSpreadsheet className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-zinc-400">No client assigned to your account.</p>
        </div>
      ) : !sheetId ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileSpreadsheet className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-zinc-400">No Google Sheet has been connected for this client yet.</p>
          {isAdmin && (
            <p className="text-zinc-500 text-sm mt-1">
              Set the Google Sheet ID in{' '}
              <a href={`/clients/${selectedClient.id}/settings`} className="text-blue-400 hover:underline">
                Client Settings
              </a>
              .
            </p>
          )}
        </div>
      ) : !sheetData ? (
        <div className="flex flex-col items-center justify-center py-20 text-center max-w-xl mx-auto">
          <p className="text-zinc-400 mb-2">Failed to load sheet data.</p>
          {sheetError && (
            <pre className="text-xs text-red-400 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-left whitespace-pre-wrap break-all w-full">
              {sheetError}
            </pre>
          )}
        </div>
      ) : sheetData.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileSpreadsheet className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-zinc-400">The connected sheet has no task rows yet.</p>
        </div>
      ) : (
        <ProjectsView
          rows={sheetData.rows}
          fetchedAt={sheetData.fetchedAt}
          isAdmin={isAdmin}
          sheetId={sheetId}
          clientId={selectedClient.id}
        />
      )}
    </div>
  )
}
