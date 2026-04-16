'use client'

import { createContext, useContext } from 'react'

export interface ClientToolContext {
  clientId: string
  clientName: string
  gscSiteUrl: string | null
  ga4PropertyId: string | null
  domain: string | null
  brandContext: string
}

const ClientToolCtx = createContext<ClientToolContext | null>(null)

export function useClientTool(): ClientToolContext {
  const ctx = useContext(ClientToolCtx)
  if (!ctx) throw new Error('useClientTool must be used inside ClientScopedTool')
  return ctx
}

interface Props {
  selectedClientId: string | null
  clientName?: string | null
  gscSiteUrl?: string | null
  ga4PropertyId?: string | null
  domain?: string | null
  brandContext?: string | null
  children: React.ReactNode
}

export default function ClientScopedTool({
  selectedClientId,
  clientName,
  gscSiteUrl,
  ga4PropertyId,
  domain,
  brandContext,
  children,
}: Props) {
  if (!selectedClientId) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
        <p className="text-sm text-surface-400 max-w-xs">
          Select a client from the top bar to run this tool.
        </p>
      </div>
    )
  }

  const value: ClientToolContext = {
    clientId: selectedClientId,
    clientName: clientName ?? 'Client',
    gscSiteUrl: gscSiteUrl ?? null,
    ga4PropertyId: ga4PropertyId ?? null,
    domain: domain ?? null,
    brandContext: brandContext ?? '',
  }

  return (
    <ClientToolCtx.Provider value={value}>
      {children}
    </ClientToolCtx.Provider>
  )
}
