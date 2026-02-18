'use client'

import { X, ExternalLink } from 'lucide-react'
import type { DeliverableWithClient, CommentWithUser } from '@/app/actions/deliverables'
import CommentThread from './comment-thread'

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: 'PDF',
  slides: 'Google Slides',
  sheets: 'Google Sheets',
  link: 'External Link',
}

function getEmbedUrl(url: string, fileType: string): string {
  if (fileType === 'slides') {
    // Handle /edit, /pub, /present → /embed
    return url.replace(/\/(edit|pub|present|view)([?#].*)?$/, '/embed')
  }
  if (fileType === 'sheets') {
    // Handle /edit → /pub?output=html for embeddable view
    return url.replace(/\/edit([?#].*)?$/, '/pub?output=html')
  }
  return url
}

interface Props {
  deliverable: DeliverableWithClient
  signedUrl: string | null
  signedUrlLoading: boolean
  comments: CommentWithUser[]
  commentsLoading: boolean
  isAdmin: boolean
  currentUserId: string
  onClose: () => void
  onCommentsChanged: () => void
}

export default function DeliverableSlideOver({
  deliverable,
  signedUrl,
  signedUrlLoading,
  comments,
  commentsLoading,
  isAdmin,
  currentUserId,
  onClose,
  onCommentsChanged,
}: Props) {
  const isPdf = deliverable.file_type === 'pdf'
  const hasUrl = !!deliverable.file_url
  const embedUrl = !isPdf && hasUrl
    ? getEmbedUrl(deliverable.file_url!, deliverable.file_type)
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wider">
              {FILE_TYPE_LABELS[deliverable.file_type]}
            </p>
            <h2 className="text-white font-semibold text-lg leading-tight truncate">
              {deliverable.title}
            </h2>
            {deliverable.clients && (
              <p className="text-zinc-400 text-sm mt-0.5">{deliverable.clients.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* File preview */}
          <div className="border-b border-zinc-800 bg-zinc-900">
            {isPdf ? (
              <div className="h-[500px] flex items-center justify-center">
                {signedUrlLoading ? (
                  <p className="text-zinc-500 text-sm">Loading PDF…</p>
                ) : signedUrl ? (
                  <iframe
                    src={signedUrl}
                    className="w-full h-full"
                    title={deliverable.title}
                  />
                ) : (
                  <p className="text-zinc-500 text-sm">Unable to load PDF.</p>
                )}
              </div>
            ) : hasUrl ? (
              <div className="h-[500px] relative flex flex-col">
                <iframe
                  src={embedUrl!}
                  className="flex-1 w-full"
                  title={deliverable.title}
                  allow="autoplay"
                />
                <div className="absolute bottom-3 right-3">
                  <a
                    href={deliverable.file_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-zinc-800/90 backdrop-blur hover:bg-zinc-700 border border-zinc-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink size={12} />
                    Open in{' '}
                    {deliverable.file_type === 'slides' || deliverable.file_type === 'sheets'
                      ? 'Google'
                      : 'new tab'}
                  </a>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center">
                <p className="text-zinc-500 text-sm">No file attached.</p>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="p-6">
            <CommentThread
              deliverableId={deliverable.id}
              comments={comments}
              loading={commentsLoading}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              onChanged={onCommentsChanged}
            />
          </div>
        </div>
      </div>
    </>
  )
}
