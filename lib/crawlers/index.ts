import { analyzePage, analyzePsi, getHost, type PageAnalysis, type PsiResult } from './page-analyzer'
import { crawlQueue } from './queue'

export type { PageAnalysis, PsiResult }
export { analyzePsi } from './page-analyzer'
export { crawlQueue } from './queue'
export * from './semrush-audit'

export interface CrawlTarget {
  url: string
}

export interface CrawlResult {
  url: string
  page: PageAnalysis
  psi?: PsiResult
}

/**
 * Crawl a list of URLs through the shared queue.
 * Returns results as they complete via the onResult callback.
 * Also fetches PSI for each URL if fetchPsi is true (slower, use sparingly).
 */
export async function crawlTargets(
  targets: CrawlTarget[],
  opts: {
    fetchPsi?: boolean
    onResult?: (result: CrawlResult) => void
  } = {}
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = []

  await Promise.all(
    targets.map(target =>
      crawlQueue.enqueue(getHost(target.url), async () => {
        const page = await analyzePage(target.url)
        let psi: PsiResult | undefined
        if (opts.fetchPsi) {
          psi = await analyzePsi(target.url)
        }
        const result: CrawlResult = { url: target.url, page, psi }
        results.push(result)
        opts.onResult?.(result)
        return result
      })
    )
  )

  return results
}
