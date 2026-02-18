'use client'

import { useState } from 'react'
import { ChevronRight, Send } from 'lucide-react'
import { postComment, resolveComment } from '@/app/actions/deliverables'
import type { CommentWithUser } from '@/app/actions/deliverables'

type ThreadedComment = CommentWithUser & { replies: CommentWithUser[] }

function groupComments(comments: CommentWithUser[]): ThreadedComment[] {
  const topLevel = comments.filter(c => !c.parent_id)
  return topLevel.map(c => ({
    ...c,
    replies: comments.filter(r => r.parent_id === c.id),
  }))
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ── Shared comment input ─────────────────────────────────────────────────────

function CommentInput({
  placeholder = 'Write a comment…',
  onSubmit,
}: {
  placeholder?: string
  onSubmit: (body: string) => Promise<void>
}) {
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setLoading(true)
    try {
      await onSubmit(body.trim())
      setBody('')
    } catch (err) {
      console.error('Failed to post comment:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={placeholder}
        disabled={loading}
        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!body.trim() || loading}
        className="p-2 bg-white text-black rounded-lg hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <Send size={14} />
      </button>
    </form>
  )
}

// ── Single thread (top-level comment + replies) ──────────────────────────────

function Thread({
  thread,
  isAdmin,
  deliverableId,
  onChanged,
}: {
  thread: ThreadedComment
  isAdmin: boolean
  deliverableId: string
  onChanged: () => void
}) {
  const [expanded, setExpanded] = useState(!thread.resolved)
  const [showReply, setShowReply] = useState(false)
  const [resolving, setResolving] = useState(false)

  async function handleReply(body: string) {
    await postComment(deliverableId, body, thread.id)
    setShowReply(false)
    onChanged()
  }

  async function handleResolve() {
    setResolving(true)
    try {
      await resolveComment(thread.id, !thread.resolved)
      onChanged()
    } catch (err) {
      console.error('Failed to resolve:', err)
    } finally {
      setResolving(false)
    }
  }

  // Collapsed resolved thread
  if (thread.resolved && !expanded) {
    return (
      <div className="border border-zinc-800 rounded-lg px-4 py-2.5">
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 w-full text-left transition-colors"
        >
          <ChevronRight size={13} className="shrink-0" />
          <span className="truncate">Resolved: {thread.body}</span>
          {thread.replies.length > 0 && (
            <span className="shrink-0 ml-auto text-zinc-600">
              {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div
      className={`border rounded-xl p-4 space-y-3 ${
        thread.resolved ? 'border-zinc-700 opacity-75' : 'border-zinc-800'
      }`}
    >
      {/* Top-level comment */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-zinc-200 truncate">{thread.users.email}</span>
            <span className="text-xs text-zinc-600 shrink-0">{formatDate(thread.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {thread.resolved && (
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Collapse
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleResolve}
                disabled={resolving}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
                  thread.resolved
                    ? 'border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200'
                    : 'border-emerald-700 text-emerald-500 hover:bg-emerald-500/10'
                }`}
              >
                {thread.resolved ? 'Unresolve' : 'Resolve'}
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">{thread.body}</p>
      </div>

      {/* Replies */}
      {thread.replies.length > 0 && (
        <div className="ml-3 pl-3 border-l border-zinc-800 space-y-3">
          {thread.replies.map(reply => (
            <div key={reply.id}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-zinc-300">{reply.users.email}</span>
                <span className="text-xs text-zinc-600">{formatDate(reply.created_at)}</span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed">{reply.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply controls */}
      {!thread.resolved && (
        <div>
          {showReply ? (
            <CommentInput placeholder="Write a reply…" onSubmit={handleReply} />
          ) : (
            <button
              onClick={() => setShowReply(true)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Comment thread root ──────────────────────────────────────────────────────

interface Props {
  deliverableId: string
  comments: CommentWithUser[]
  loading: boolean
  isAdmin: boolean
  currentUserId: string
  onChanged: () => void
}

export default function CommentThread({
  deliverableId,
  comments,
  loading,
  isAdmin,
  onChanged,
}: Props) {
  const threads = groupComments(comments)

  async function handleNewComment(body: string) {
    await postComment(deliverableId, body)
    onChanged()
  }

  return (
    <div className="space-y-4">
      <h3 className="text-white font-semibold text-sm">
        Comments{' '}
        {!loading && comments.length > 0 && (
          <span className="text-zinc-500 font-normal">({comments.length})</span>
        )}
      </h3>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading comments…</p>
      ) : threads.length === 0 ? (
        <p className="text-zinc-600 text-sm">No comments yet. Be the first to leave one.</p>
      ) : (
        <div className="space-y-3">
          {threads.map(thread => (
            <Thread
              key={thread.id}
              thread={thread}
              isAdmin={isAdmin}
              deliverableId={deliverableId}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}

      <div className="pt-1">
        <CommentInput onSubmit={handleNewComment} />
      </div>
    </div>
  )
}
