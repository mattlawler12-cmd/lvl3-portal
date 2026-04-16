export interface SemrushAuditSummary {
  projectId: string
  domain: string
  crawledPages: number
  errors: number
  warnings: number
  notices: number
  crawlDate: string | null
  topIssues: Array<{ checkId: string; description: string; count: number; severity: 'error' | 'warning' | 'notice' }>
}

export interface SemrushProject {
  id: string
  domain: string
}

const SEMRUSH_API = 'https://api.semrush.com'
const API_KEY = () => process.env.SEMRUSH_API_KEY ?? ''

/** Create a new Semrush Site Audit project for a domain */
export async function createSemrushProject(domain: string): Promise<SemrushProject | null> {
  try {
    const res = await fetch(`${SEMRUSH_API}/management/v1/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_name: domain,
        api_key: API_KEY(),
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { project_id?: string }
    if (!data.project_id) return null
    return { id: data.project_id, domain }
  } catch {
    return null
  }
}

/** Trigger a new Site Audit crawl for an existing project */
export async function triggerSemrushAudit(projectId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${SEMRUSH_API}/reports/v1/projects/${projectId}/siteaudit/launch?key=${API_KEY()}`,
      { method: 'POST' }
    )
    return res.ok
  } catch {
    return false
  }
}

/** Poll audit status (returns true when complete) */
export async function getSemrushAuditStatus(projectId: string): Promise<'running' | 'complete' | 'error'> {
  try {
    const res = await fetch(
      `${SEMRUSH_API}/reports/v1/projects/${projectId}/siteaudit/info?key=${API_KEY()}`
    )
    if (!res.ok) return 'error'
    const data = await res.json() as { status?: string }
    if (data.status === 'FINISHED') return 'complete'
    if (data.status === 'IN_PROGRESS') return 'running'
    return 'error'
  } catch {
    return 'error'
  }
}

/** Fetch the audit summary (issues, stats) */
export async function getSemrushAuditSummary(projectId: string, domain: string): Promise<SemrushAuditSummary | null> {
  try {
    const res = await fetch(
      `${SEMRUSH_API}/reports/v1/projects/${projectId}/siteaudit/summary?key=${API_KEY()}`
    )
    if (!res.ok) return null
    const data = await res.json() as {
      crawl_date?: string
      pages_crawled?: number
      issues?: { errors?: number; warnings?: number; notices?: number }
      top_issues?: Array<{ check_id?: string; description?: string; count?: number; severity?: string }>
    }
    return {
      projectId,
      domain,
      crawledPages: data.pages_crawled ?? 0,
      errors: data.issues?.errors ?? 0,
      warnings: data.issues?.warnings ?? 0,
      notices: data.issues?.notices ?? 0,
      crawlDate: data.crawl_date ?? null,
      topIssues: (data.top_issues ?? []).slice(0, 10).map(i => ({
        checkId: i.check_id ?? '',
        description: i.description ?? '',
        count: i.count ?? 0,
        severity: (['error', 'warning', 'notice'].includes(i.severity ?? '') ? i.severity : 'notice') as 'error' | 'warning' | 'notice',
      })),
    }
  } catch {
    return null
  }
}
