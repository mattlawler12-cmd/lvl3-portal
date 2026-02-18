import { google } from 'googleapis'

export type SheetRow = {
  month: string
  category: string
  task: string
  status: string
  fee: number | null
  note: string | null
}

function getCredentials() {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var is not set')

  // Strip surrounding single or double quotes (common dotenv copy-paste issue)
  raw = raw.trim()
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    raw = raw.slice(1, -1)
  }

  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. ` +
      `Starts with: ${raw.slice(0, 20)} — ` +
      `Error: ${e instanceof Error ? e.message : String(e)}`
    )
  }
}

function parseFee(raw: string): number | null {
  if (!raw || raw.trim() === '') return null
  const cleaned = raw.replace(/[$,]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

export async function fetchSheetRows(sheetId: string): Promise<SheetRow[]> {
  const credentials = getCredentials()

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId.trim().replace(/\/+$/, ''),
    range: 'A:F',
  })

  const allRows = response.data.values ?? []
  // Skip header row
  const dataRows = allRows.slice(1)

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
