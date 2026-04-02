'use client'

import { useState, useCallback, useRef } from 'react'
import { Download } from 'lucide-react'
import type {
  TopicInput,
  RunMode,
  PipelineEvent,
  DataAvailability,
  KeywordPlan,
  ContentBrief,
  DraftReview,
} from '@/lib/seo-content-engine/types'
import { loadRun, getDocxUrl } from '@/app/actions/seo-content-engine'
import TopicForm from './components/TopicForm'
import XlsxUploader from './components/XlsxUploader'
import PipelineProgress from './components/PipelineProgress'
import DataAvailabilityPanel from './components/DataAvailabilityPanel'
import KeywordPlanView from './components/KeywordPlanView'
import BriefPreview from './components/BriefPreview'
import DraftPreview from './components/DraftPreview'
import ReviewSummary from './components/ReviewSummary'
import RunHistory from './components/RunHistory'

// ── Per-topic progress state ────────────────────────────────

export interface StageLogEntry {
  step: string
  detail: string
  elapsed: number // ms since topic started
}

export interface TopicState {
  status: 'pending' | 'running' | 'complete' | 'failed'
  currentStep: string
  pct: number
  logs: string[]
  startedAt: number | null
  lastEventAt: number | null
  stageLog: StageLogEntry[]
  dataAvailability: DataAvailability
  result: {
    keywordPlan: KeywordPlan | null
    brief: ContentBrief | Record<string, unknown> | null
    draft: string | null
    draftReview: DraftReview | null
    revisedDraft: string | null
    wordCount: number
    error?: string | null
    warnings?: string[]
    docxStoragePath?: string | null
  } | null
}

function emptyTopicState(): TopicState {
  return {
    status: 'pending',
    currentStep: '',
    pct: 0,
    logs: [],
    startedAt: null,
    lastEventAt: null,
    stageLog: [],
    dataAvailability: {},
    result: null,
  }
}

// ── Tabs ────────────────────────────────────────────────────

const TABS = ['New Run', 'Progress', 'Results', 'History'] as const
type Tab = (typeof TABS)[number]

// ── Mode labels ─────────────────────────────────────────────

const MODE_OPTIONS: { value: RunMode; label: string }[] = [
  { value: 'keywords_only', label: 'Keywords Only' },
  { value: 'brief', label: 'Brief + Keywords' },
  { value: 'full', label: 'Full Pipeline' },
]

// ── Component ───────────────────────────────────────────────

interface Props {
  clientId: string
  clientName: string
  clientBrandContext?: string | null
}

export default function SeoContentEngineClient({ clientId, clientName, clientBrandContext }: Props) {
  // ── State ───────────────────────────────────────────────
  const [topics, setTopics] = useState<TopicInput[]>([])
  const [mode, setMode] = useState<RunMode>('full')
  const [brandContext, setBrandContext] = useState(clientBrandContext ?? '')
  const [isRunning, setIsRunning] = useState(false)
  const [, setRunId] = useState<string | null>(null)
  const [topicStates, setTopicStates] = useState<Map<number, TopicState>>(new Map())
  const [preflightResults, setPreflightResults] = useState<{ source: string; ok: boolean; detail: string }[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('New Run')
  const abortRef = useRef<AbortController | null>(null)

  // ── Helpers ─────────────────────────────────────────────

  const updateTopicState = useCallback(
    (index: number, updater: (prev: TopicState) => TopicState) => {
      setTopicStates((prev) => {
        const next = new Map(prev)
        const current = next.get(index) ?? emptyTopicState()
        next.set(index, updater(current))
        return next
      })
    },
    []
  )

  // ── Stream consumer ─────────────────────────────────────

  const startRun = useCallback(async () => {
    if (isRunning || topics.length === 0) return

    setIsRunning(true)
    setRunId(null)
    setPreflightResults([])

    // Initialise topic states
    const initial = new Map<number, TopicState>()
    topics.forEach((_, i) => initial.set(i, emptyTopicState()))
    setTopicStates(initial)

    // Auto-switch to Progress tab
    setActiveTab('Progress')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const formData = new FormData()
      formData.append('clientId', clientId)
      formData.append('mode', mode)
      formData.append('brandContext', brandContext)
      formData.append('topics', JSON.stringify(topics))

      const res = await fetch('/api/seo-content-engine', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`Pipeline request failed: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Keep incomplete last line in buffer
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          let event: PipelineEvent
          try {
            event = JSON.parse(trimmed) as PipelineEvent
          } catch {
            continue
          }

          // Route event
          switch (event.type) {
            case 'run_started':
              setRunId(event.runId)
              break

            case 'preflight':
              setPreflightResults((prev) => [
                ...prev,
                { source: event.source, ok: event.ok, detail: event.detail },
              ])
              break

            case 'topic_started': {
              const now = Date.now()
              updateTopicState(event.topicIndex, (prev) => ({
                ...prev,
                status: 'running',
                currentStep: 'Starting...',
                startedAt: now,
                lastEventAt: now,
                logs: [...prev.logs, `Topic started: ${event.title}`],
              }))
              break
            }

            case 'progress': {
              const now = Date.now()
              updateTopicState(event.topicIndex, (prev) => ({
                ...prev,
                currentStep: `${event.phase}: ${event.step}`,
                pct: event.pct,
                lastEventAt: now,
                stageLog: [
                  ...prev.stageLog,
                  {
                    step: event.step,
                    detail: event.detail,
                    elapsed: prev.startedAt ? now - prev.startedAt : 0,
                  },
                ],
                logs: [...prev.logs, `[${event.phase}] ${event.step} — ${event.detail}`],
              }))
              break
            }

            case 'data_source':
              updateTopicState(event.topicIndex, (prev) => ({
                ...prev,
                dataAvailability: {
                  ...prev.dataAvailability,
                  [event.source]: event.status,
                },
              }))
              break

            case 'topic_complete':
              updateTopicState(event.topicIndex, (prev) => ({
                ...prev,
                status: event.status === 'complete' ? 'complete' : 'failed',
                pct: 100,
                currentStep: event.status === 'complete' ? 'Complete' : 'Partial — some phases failed',
                lastEventAt: Date.now(),
                logs: [
                  ...prev.logs,
                  `Topic ${event.status}${event.wordCount ? ` (${event.wordCount} words)` : ''}`,
                ],
                result: {
                  ...(prev.result ?? { keywordPlan: null, brief: null, draft: null, draftReview: null, revisedDraft: null, wordCount: 0 }),
                  wordCount: event.wordCount ?? prev.result?.wordCount ?? 0,
                  error: event.error ?? null,
                  warnings: event.warnings ?? [],
                  docxStoragePath: event.docxStoragePath ?? prev.result?.docxStoragePath ?? null,
                },
              }))
              break

            case 'topic_error':
              updateTopicState(event.topicIndex, (prev) => ({
                ...prev,
                status: 'failed',
                currentStep: 'Error',
                lastEventAt: Date.now(),
                logs: [...prev.logs, `Error: ${event.error}`],
              }))
              break

            case 'heartbeat':
              updateTopicState(event.topicIndex, (prev) => ({
                ...prev,
                lastEventAt: Date.now(),
              }))
              break

            case 'run_complete':
              setRunId(event.runId)
              setActiveTab('Results')
              break

            case 'error':
              // Global error — log to all topics
              setTopicStates((prev) => {
                const next = new Map(prev)
                Array.from(next.entries()).forEach(([idx, state]) => {
                  next.set(idx, {
                    ...state,
                    logs: [...state.logs, `Pipeline error: ${event.message}`],
                  })
                })
                return next
              })
              break
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Pipeline stream error:', err)
      }
    } finally {
      setIsRunning(false)
      abortRef.current = null
    }
  }, [isRunning, topics, clientId, mode, brandContext, updateTopicState])

  const stopRun = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsRunning(false)
    // Mark any running topics as failed
    setTopicStates((prev) => {
      const next = new Map(prev)
      Array.from(next.entries()).forEach(([idx, state]) => {
        if (state.status === 'running' || state.status === 'pending') {
          next.set(idx, {
            ...state,
            status: 'failed',
            currentStep: 'Stopped by user',
            lastEventAt: Date.now(),
            logs: [...state.logs, 'Stopped by user'],
          })
        }
      })
      return next
    })
  }, [])

  // ── Load historical run from DB ─────────────────────────

  const handleLoadRun = useCallback(async (id: string, status: string) => {
    const result = await loadRun(id)
    if (result.error || !result.data) return

    const run = result.data
    const loadedTopics: TopicInput[] = run.topics.map((t) => ({
      title: t.title,
      target_audience: t.target_audience ?? undefined,
      angle: t.angle ?? undefined,
      existing_url: t.existing_url ?? undefined,
      pillar: t.pillar ?? undefined,
      funnel_stage: t.funnel_stage ?? undefined,
      primary_intent: t.primary_intent ?? undefined,
      summary: t.summary ?? undefined,
      differentiation_angle: t.differentiation_angle ?? undefined,
      internal_linking: t.internal_linking ?? undefined,
      geo_notes: t.geo_notes ?? undefined,
      seed_keywords: (t.seed_keywords ?? []) as unknown as TopicInput['seed_keywords'],
    }))

    const loadedStates = new Map<number, TopicState>()
    run.topics.forEach((t, i) => {
      const validStatuses: TopicState['status'][] = ['complete', 'failed', 'running', 'pending']
      const topicStatus = validStatuses.includes(t.status as TopicState['status'])
        ? (t.status as TopicState['status'])
        : 'pending'

      loadedStates.set(i, {
        status: topicStatus,
        currentStep: topicStatus === 'complete'
          ? 'Complete'
          : topicStatus === 'failed'
            ? (t.error ?? 'Failed')
            : '',
        pct: topicStatus === 'complete' ? 1 : t.status === 'partial' ? 0.5 : 0,
        logs: [],
        startedAt: null,
        lastEventAt: null,
        stageLog: [],
        dataAvailability: (t.data_availability ?? {}) as DataAvailability,
        result: (t.keyword_plan || t.brief || t.draft || t.error) ? {
          keywordPlan: (t.keyword_plan as KeywordPlan | null) ?? null,
          brief: (t.brief as ContentBrief | Record<string, unknown> | null) ?? null,
          draft: t.revised_draft ?? t.draft ?? null,
          draftReview: (t.draft_review as DraftReview | null) ?? null,
          revisedDraft: t.revised_draft ?? null,
          wordCount: t.word_count ?? 0,
          error: t.error ?? null,
          warnings: t.warnings ?? [],
          docxStoragePath: t.docx_storage_path ?? null,
        } : null,
      })
    })

    setTopics(loadedTopics)
    setTopicStates(loadedStates)
    setRunId(id)
    setPreflightResults([])
    setActiveTab(status === 'running' ? 'Progress' : 'Results')
  }, [])

  // ── Completed topic indices ─────────────────────────────

  const completedTopics = Array.from(topicStates.entries())
    .filter(([, s]) => s.status === 'complete')
    .map(([i]) => i)

  const downloadDocx = useCallback(async (storagePath: string, title: string) => {
    const result = await getDocxUrl(storagePath)
    if (result.error || !result.data) {
      console.error('Failed to get download URL:', result.error)
      return
    }
    const a = document.createElement('a')
    a.href = result.data
    a.download = `${title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.docx`
    a.click()
  }, [])

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-lg bg-surface-900 border border-surface-700 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${
                activeTab === tab
                  ? 'bg-surface-800 text-surface-100'
                  : 'text-surface-400 hover:text-surface-300'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── New Run Tab ─────────────────────────────────── */}
      {activeTab === 'New Run' && (
        <div className="space-y-6">
          {/* Topic input */}
          <div className="rounded-xl border border-surface-700 bg-surface-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-surface-100 uppercase tracking-wider">
              Topics
            </h2>
            <TopicForm topics={topics} onTopicsChange={setTopics} />
            <XlsxUploader
              onTopicsParsed={(parsed) => setTopics((prev) => [...prev, ...parsed])}
            />
          </div>

          {/* Mode selector */}
          <div className="rounded-xl border border-surface-700 bg-surface-900 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-surface-100 uppercase tracking-wider">
              Pipeline Mode
            </h2>
            <div className="flex items-center gap-2">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-full border transition-colors
                    ${
                      mode === opt.value
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-surface-800 border-surface-700 text-surface-400 hover:text-surface-300 hover:border-surface-600'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brand context */}
          <div className="rounded-xl border border-surface-700 bg-surface-900 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-surface-100 uppercase tracking-wider">
              Brand Context
            </h2>
            <p className="text-xs text-surface-400">
              {clientBrandContext
                ? `Pre-filled from ${clientName} client settings. Edit to override for this run.`
                : `Optional. Provide brand voice, tone, or style notes for ${clientName}. Save in client settings for reuse.`}
            </p>
            <textarea
              value={brandContext}
              onChange={(e) => setBrandContext(e.target.value)}
              placeholder="e.g. Professional, authoritative tone. Avoid first person. Focus on residential services..."
              rows={4}
              className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y"
            />
          </div>

          {/* Start / Stop buttons */}
          <div className="flex gap-3">
            <button
              onClick={startRun}
              disabled={isRunning || topics.length === 0}
              className="flex-1 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRunning
                ? 'Pipeline Running...'
                : topics.length === 0
                  ? 'Add Topics to Start'
                  : `Start Pipeline — ${topics.length} topic${topics.length === 1 ? '' : 's'}`}
            </button>
            {isRunning && (
              <button
                onClick={stopRun}
                className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Progress Tab ────────────────────────────────── */}
      {activeTab === 'Progress' && (
        <div className="space-y-6">
          {topics.length === 0 && topicStates.size === 0 ? (
            <div className="rounded-xl border border-surface-700 bg-surface-900 p-8 text-center">
              <p className="text-sm text-surface-400">
                No pipeline running. Switch to &quot;New Run&quot; to start.
              </p>
            </div>
          ) : (
            <>
              {/* Preflight results */}
              {preflightResults.length > 0 && (
                <div className="rounded-xl border border-surface-700 bg-surface-900 p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Connection Preflight
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {preflightResults.map((r) => (
                      <div
                        key={r.source}
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          r.ok
                            ? 'border-emerald-500/30 bg-emerald-900/10 text-emerald-300'
                            : 'border-red-500/30 bg-red-900/10 text-red-300'
                        }`}
                      >
                        <div className="font-medium">{r.ok ? '\u2713' : '\u2717'} {r.source}</div>
                        <div className="text-[10px] opacity-70 mt-0.5 truncate">{r.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isRunning && (
                <div className="flex justify-end">
                  <button
                    onClick={stopRun}
                    className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Stop Pipeline
                  </button>
                </div>
              )}
              <PipelineProgress
                topicTitles={topics.map((t) => t.title)}
                topicStates={topicStates}
              />

              {/* Aggregated data availability */}
              {Array.from(topicStates.entries()).some(
                ([, s]) => Object.keys(s.dataAvailability).length > 0
              ) && (
                <div className="rounded-xl border border-surface-700 bg-surface-900 p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    Data Availability
                  </h3>
                  <DataAvailabilityPanel
                    availability={
                      Array.from(topicStates.values()).reduce<DataAvailability>(
                        (acc, s) => ({ ...acc, ...s.dataAvailability }),
                        {}
                      )
                    }
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Results Tab ─────────────────────────────────── */}
      {activeTab === 'Results' && (
        <div className="space-y-8">
          {completedTopics.length === 0 ? (
            <div className="rounded-xl border border-surface-700 bg-surface-900 p-8 text-center">
              <p className="text-sm text-surface-400">
                No completed topics yet.{' '}
                {isRunning ? 'Pipeline is still running.' : 'Start a run to see results.'}
              </p>
            </div>
          ) : (
            <>
              {/* Download All button */}
              {completedTopics.some((idx) => topicStates.get(idx)?.result?.docxStoragePath) && (
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      for (const idx of completedTopics) {
                        const path = topicStates.get(idx)?.result?.docxStoragePath
                        const title = topics[idx]?.title ?? `Topic ${idx + 1}`
                        if (path) {
                          await downloadDocx(path, title)
                          // Small delay between downloads to avoid browser blocking
                          await new Promise((r) => setTimeout(r, 300))
                        }
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                  >
                    <Download className="h-4 w-4" />
                    Download All DOCX ({completedTopics.filter((idx) => topicStates.get(idx)?.result?.docxStoragePath).length})
                  </button>
                </div>
              )}
              {completedTopics.map((idx) => {
                const state = topicStates.get(idx)!
                const result = state.result
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-surface-700 bg-surface-900 p-5 space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-surface-100">
                        {topics[idx]?.title ?? `Topic ${idx + 1}`}
                      </h3>
                      {result?.docxStoragePath && (
                        <button
                          onClick={() => downloadDocx(result.docxStoragePath!, topics[idx]?.title ?? `Topic ${idx + 1}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-700 bg-surface-800 px-3 py-1.5 text-xs font-medium text-surface-300 transition-colors hover:border-surface-600 hover:text-surface-100"
                        >
                          <Download className="h-3.5 w-3.5" />
                          DOCX
                        </button>
                      )}
                    </div>

                    {result?.keywordPlan && (
                      <KeywordPlanView plan={result.keywordPlan} />
                    )}

                    {result?.brief && <BriefPreview brief={result.brief} />}

                    {result?.draft && (
                      <DraftPreview
                        draft={result.revisedDraft ?? result.draft}
                        wordCount={result.wordCount}
                      />
                    )}

                  {result?.draftReview && (
                    <ReviewSummary review={result.draftReview} />
                  )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ── History Tab ─────────────────────────────────── */}
      {activeTab === 'History' && (
        <RunHistory
          clientId={clientId}
          onLoadRun={handleLoadRun}
        />
      )}
    </div>
  )
}
