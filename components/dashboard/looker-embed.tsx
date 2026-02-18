'use client'

import { ExternalLink } from 'lucide-react'

type Props = {
  url: string
  clientName?: string
}

export default function LookerEmbed({ url, clientName }: Props) {
  return (
    <>
      {/* Desktop: full-height iframe */}
      <div className="hidden md:block relative w-full h-full">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-4 z-10 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Open in Looker Studio
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <iframe
          src={url}
          className="w-full h-full border-0"
          allowFullScreen
          title={clientName ? `${clientName} Dashboard` : 'Dashboard'}
        />
      </div>

      {/* Mobile: card with open button */}
      <div className="md:hidden p-8">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 max-w-sm mx-auto text-center">
          <div className="w-12 h-12 bg-blue-900/40 border border-blue-700/50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-white font-semibold mb-1">
            {clientName ? `${clientName} Dashboard` : 'Analytics Dashboard'}
          </h3>
          <p className="text-zinc-400 text-sm mb-5">
            This dashboard is best viewed on a desktop. You can also open it directly in Looker Studio.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Open Dashboard
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </>
  )
}
