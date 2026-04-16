interface QueueJob<T> {
  key: string        // host or identifier for rate limiting
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

interface QueueOptions {
  maxConcurrency?: number   // default 10
  perHostDelayMs?: number   // default 500ms between requests to same host
}

export class CrawlQueue {
  private running = 0
  private queue: QueueJob<unknown>[] = []
  private lastRunByKey: Map<string, number> = new Map()
  private readonly maxConcurrency: number
  private readonly perHostDelayMs: number

  constructor(opts: QueueOptions = {}) {
    this.maxConcurrency = opts.maxConcurrency ?? 10
    this.perHostDelayMs = opts.perHostDelayMs ?? 500
  }

  enqueue<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ key, fn, resolve, reject } as QueueJob<unknown>)
      this.tick()
    })
  }

  private tick() {
    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const now = Date.now()
      // Find first job whose host delay has elapsed
      const idx = this.queue.findIndex(job => {
        const last = this.lastRunByKey.get(job.key) ?? 0
        return now - last >= this.perHostDelayMs
      })
      if (idx === -1) {
        // All pending jobs need to wait — schedule a retry
        const soonest = Math.min(...Array.from(this.lastRunByKey.values()))
        const waitMs = this.perHostDelayMs - (now - soonest) + 10
        setTimeout(() => this.tick(), waitMs)
        break
      }
      const job = this.queue.splice(idx, 1)[0]
      this.running++
      this.lastRunByKey.set(job.key, Date.now())
      job.fn()
        .then(job.resolve as (v: unknown) => void)
        .catch(job.reject)
        .finally(() => {
          this.running--
          this.tick()
        })
    }
  }
}

// Singleton instance for the app
export const crawlQueue = new CrawlQueue({ maxConcurrency: 8, perHostDelayMs: 500 })
