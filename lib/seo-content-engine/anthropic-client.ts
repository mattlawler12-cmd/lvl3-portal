/**
 * SEO Content Engine — Anthropic LLM Client
 * Wraps @anthropic-ai/sdk with stage-based routing, retries, JSON mode.
 */
import Anthropic from '@anthropic-ai/sdk'
import { MODELS, TEMPERATURES, MAX_TOKENS } from './config'
import { parseJsonResponse } from './utils'

const MAX_RETRIES = 3
const RETRY_BASE_MS = 1000

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export class SeoAnthropicClient {
  private client: Anthropic
  private _totalTokens = { input: 0, output: 0 }
  private _stagesCompleted = 0

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  get totalTokens() {
    return { ...this._totalTokens }
  }

  get stagesCompleted() {
    return this._stagesCompleted
  }

  /**
   * Call the LLM for a given pipeline stage, returning raw text.
   * onHeartbeat fires at most once per 3s during streaming to signal liveness.
   */
  async call(stage: string, system: string, user: string, onHeartbeat?: () => void): Promise<string> {
    const model = MODELS[stage] ?? 'claude-sonnet-4-6'
    const temperature = TEMPERATURES[stage] ?? 0.5
    const maxTokens = MAX_TOKENS[stage] ?? 4096

    let lastError: Error | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 120_000)

        let lastHeartbeat = 0
        const stream = this.client.messages.stream(
          {
            model,
            max_tokens: maxTokens,
            temperature,
            system,
            messages: [{ role: 'user', content: user }],
          },
          { signal: controller.signal },
        )

        // Emit throttled heartbeats during token streaming
        stream.on('text', () => {
          if (onHeartbeat) {
            const now = Date.now()
            if (now - lastHeartbeat > 3000) {
              lastHeartbeat = now
              onHeartbeat()
            }
          }
        })

        const response = await stream.finalMessage()
        clearTimeout(timer)

        // Track token usage
        this._totalTokens.input += response.usage?.input_tokens ?? 0
        this._totalTokens.output += response.usage?.output_tokens ?? 0
        this._stagesCompleted++

        // Extract text from response
        const textBlock = response.content.find((b) => b.type === 'text')
        return textBlock?.text ?? ''
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        // Don't retry on 4xx errors (except 429 rate limit)
        if (
          err instanceof Anthropic.APIError &&
          err.status !== undefined &&
          err.status >= 400 &&
          err.status < 500 &&
          err.status !== 429
        ) {
          throw lastError
        }

        // Exponential backoff
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt)
          await new Promise((r) => setTimeout(r, delay))
        }
      }
    }

    throw lastError ?? new Error(`LLM call failed for stage: ${stage}`)
  }

  /**
   * Call the LLM expecting JSON output. Parses the response automatically.
   * onHeartbeat fires at most once per 3s during streaming to signal liveness.
   */
  async callJson(
    stage: string,
    system: string,
    user: string,
    onHeartbeat?: () => void,
  ): Promise<Record<string, unknown> | unknown[] | null> {
    const jsonSystem = system + '\n\nReturn ONLY valid JSON. No commentary outside the JSON.'
    const text = await this.call(stage, jsonSystem, user, onHeartbeat)
    const parsed = parseJsonResponse(text)
    if (!parsed && text.length > 0) {
      console.error(`[${stage}] JSON parse failed. Response length: ${text.length}. Last 200 chars: ${text.slice(-200)}`)
    }
    return parsed
  }
}
