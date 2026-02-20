import { google } from 'googleapis'
import { getAdminOAuthClient } from '@/lib/google-auth'

export type SheetRow = {
  month: string
  category: string
  task: string
  status: string
  fee: number | null
  note: string | null
}

export type ColumnMap = {
  month?: string
  category?: string
  task?: string
  status?: string
  fee?: string
  note?: string
}

export function parseSheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : urlOrId
}


function parseFee(raw: string): number | null {
  if (!raw || raw.trim() === '') return null
  const cleaned = raw.replace(/[$,]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

async function getAuthAndSheets() {
  const auth = await getAdminOAuthClient()
  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

export async function fetchSheetHeaders(
  sheetId: string,
  headerRow: number = 1
): Promise<string[]> {
  const sheets = await getAuthAndSheets()

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId.trim().replace(/\/+$/, ''),
    range: `A${headerRow}:Z${headerRow}`,
  })

  const row = response.data.values?.[0] ?? []
  return row
    .map((cell: unknown) => String(cell ?? '').trim())
    .filter(Boolean)
}

export async function fetchSheetRows(
  sheetId: string,
  headerRow: number = 1,
  columnMap: ColumnMap | null = null
): Promise<SheetRow[]> {
  const sheets = await getAuthAndSheets()

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId.trim().replace(/\/+$/, ''),
    range: 'A:Z',
  })

  const allRows = response.data.values ?? []
  // Skip header row(s)
  const dataRows = allRows.slice(headerRow)

  if (columnMap) {
    // Build header-name → column-index map from the header row
    const headerRowData = allRows[headerRow - 1] ?? []
    const headerIndex: Record<string, number> = {}
    headerRowData.forEach((cell: unknown, i: number) => {
      const name = String(cell ?? '').trim()
      if (name) headerIndex[name] = i
    })

    const idx = (fieldHeader: string | undefined): number | undefined => {
      if (!fieldHeader) return undefined
      return headerIndex[fieldHeader]
    }

    const mIdx = idx(columnMap.month)
    const cIdx = idx(columnMap.category)
    const tIdx = idx(columnMap.task)
    const sIdx = idx(columnMap.status)
    const fIdx = idx(columnMap.fee)
    const nIdx = idx(columnMap.note)

    const filterCol = mIdx !== undefined ? mIdx : 0

    return dataRows
      .filter((row) => row.length > 0 && row[filterCol])
      .map((row) => ({
        month: mIdx !== undefined ? (row[mIdx] ?? '').toString().trim() : '',
        category: cIdx !== undefined ? (row[cIdx] ?? '').toString().trim() : '',
        task: tIdx !== undefined ? (row[tIdx] ?? '').toString().trim() : '',
        status: sIdx !== undefined ? (row[sIdx] ?? '').toString().trim() : '',
        fee: fIdx !== undefined ? parseFee((row[fIdx] ?? '').toString()) : null,
        note: nIdx !== undefined && row[nIdx] ? row[nIdx].toString().trim() || null : null,
      }))
  }

  // Fallback: positional mapping (A=month, B=category, C=task, D=status, E=fee, F=note)
  return dataRows
    .filter((row) => row.length > 0 && row[0])
    .map((row) => ({
      month: (row[0] ?? '').toString().trim(),
      category: (row[1] ?? '').toString().trim(),
      task: (row[2] ?? '').toString().trim(),
      status: (row[3] ?? '').toString().trim(),
      fee: parseFee((row[4] ?? '').toString()),
      note: row[5] ? row[5].toString().trim() || null : null,
    }))
}
