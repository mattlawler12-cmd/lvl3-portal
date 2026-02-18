'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { DeliverableWithClient, CommentWithUser } from '@/app/actions/deliverables'
import { markViewed, fetchComments, getSignedUrl } from '@/app/actions/deliverables'
import DeliverableCard from './deliverable-card'
import DeliverableSlideOver from './deliverable-slide-over'
import AddDeliverableModal from './add-deliverable-modal'

interface Props {
  initialDeliverables: DeliverableWithClient[]
  clients: { id: string; name: string }[]
  isAdmin: boolean
  currentUserId: string
}

export default function DeliverablesClient({
  initialDeliverables,
  clients,
  isAdmin,
  currentUserId,
}: Props) {
  const router = useRouter()
  const [deliverables, setDeliverables] = useState(initialDeliverables)
  const [selected, setSelected] = useState<DeliverableWithClient | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [signedUrlLoading, setSignedUrlLoading] = useState(false)

  // Sync local state when server data refreshes (e.g. after adding a deliverable)
  useEffect(() => {
    setDeliverables(initialDeliverables)
    setSelected(prev => {
      if (!prev) return null
      return initialDeliverables.find(d => d.id === prev.id) ?? prev
    })
  }, [initialDeliverables])

  const refreshComments = useCallback(async () => {
    if (!selected) return
    try {
      const data = await fetchComments(selected.id)
      setComments(data)
    } catch (err) {
      console.error('Failed to refresh comments:', err)
    }
  }, [selected])

  async function handleSelect(deliverable: DeliverableWithClient) {
    setSelected(deliverable)
    setComments([])
    setSignedUrl(null)

    // Optimistically clear "New" badge
    if (!deliverable.viewed_at) {
      setDeliverables(prev =>
        prev.map(d =>
          d.id === deliverable.id ? { ...d, viewed_at: new Date().toISOString() } : d
        )
      )
      markViewed(deliverable.id).catch(console.error)
    }

    // Load comments
    setCommentsLoading(true)
    fetchComments(deliverable.id)
      .then(setComments)
      .catch(err => console.error('Failed to fetch comments:', err))
      .finally(() => setCommentsLoading(false))

    // Load signed URL for PDFs
    if (deliverable.file_type === 'pdf' && deliverable.file_url) {
      setSignedUrlLoading(true)
      getSignedUrl(deliverable.file_url)
        .then(setSignedUrl)
        .catch(err => console.error('Failed to get signed URL:', err))
        .finally(() => setSignedUrlLoading(false))
    }
  }

  function handleModalClose() {
    setIsModalOpen(false)
    router.refresh()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Deliverables</h1>
          <p className="mt-1 text-zinc-400 text-sm">
            {isAdmin ? 'Manage and share files with clients' : 'Your files and documents'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-colors"
          >
            <Plus size={16} />
            Add Deliverable
          </button>
        )}
      </div>

      {/* Grid */}
      {deliverables.length === 0 ? (
        <div className="text-center py-24 text-zinc-600">
          <p className="text-sm">No deliverables yet.</p>
          {isAdmin && (
            <p className="text-xs mt-1">Click &ldquo;Add Deliverable&rdquo; to get started.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deliverables.map(d => (
            <DeliverableCard
              key={d.id}
              deliverable={d}
              showClientName={isAdmin}
              isSelected={selected?.id === d.id}
              onClick={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Slide-over */}
      {selected && (
        <DeliverableSlideOver
          deliverable={selected}
          signedUrl={signedUrl}
          signedUrlLoading={signedUrlLoading}
          comments={comments}
          commentsLoading={commentsLoading}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onClose={() => setSelected(null)}
          onCommentsChanged={refreshComments}
        />
      )}

      {/* Add modal */}
      {isModalOpen && (
        <AddDeliverableModal clients={clients} onClose={handleModalClose} />
      )}
    </div>
  )
}
