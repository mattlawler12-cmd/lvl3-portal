import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import sharp from 'sharp'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ParsedRow {
  filename: string
  prompt: string
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseCsvTsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []

  const delimiter = lines[0].includes('\t') ? '\t' : ','

  const splitLine = (line: string): string[] => {
    if (delimiter === ',') {
      const cols: string[] = []
      let inQuote = false
      let cur = ''
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') { inQuote = !inQuote }
        else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
        else { cur += ch }
      }
      cols.push(cur.trim())
      return cols
    }
    return line.split('\t').map((c) => c.trim())
  }

  let titleColIdx = 0
  let promptColIdx = 1
  let startRow = 0

  const firstRow = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z ]/g, ''))
  const titleHeaders = ['title', 'post title', 'filename', 'name']
  const promptHeaders = ['prompt', 'description', 'image prompt']

  const foundTitle = firstRow.findIndex((h) => titleHeaders.some((t) => h.includes(t)))
  const foundPrompt = firstRow.findIndex((h) => promptHeaders.some((t) => h.includes(t)))

  if (foundTitle !== -1 || foundPrompt !== -1) {
    if (foundTitle !== -1) titleColIdx = foundTitle
    if (foundPrompt !== -1) promptColIdx = foundPrompt
    startRow = 1
  }

  const rows: ParsedRow[] = []
  for (let i = startRow; i < lines.length; i++) {
    const cols = splitLine(lines[i])
    const title = cols[titleColIdx]?.replace(/^["']|["']$/g, '') ?? ''
    const prompt = cols[promptColIdx]?.replace(/^["']|["']$/g, '') ?? ''
    if (!title || !prompt) continue
    rows.push({ filename: slugify(title) || `image-${i}`, prompt })
  }
  return rows
}

async function generateAndCrop(prompt: string): Promise<Buffer> {
  const resp = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1536x1024',
    n: 1,
  })

  const b64 = resp.data?.[0]?.b64_json
  if (!b64) throw new Error('No image data returned from OpenAI')

  const rawBuffer = Buffer.from(b64, 'base64')

  const webpBuffer = await sharp(rawBuffer)
    .resize({
      width: 1500,
      height: 1000,
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 82, effort: 6 })
    .toBuffer()

  return webpBuffer
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const service = await createServiceClient()
  const { data: profile } = await service
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  let rows: ParsedRow[]
  let styleRules: string

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    styleRules = (formData.get('styleRules') as string | null) ?? ''

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 })
    }

    const text = await file.text()
    rows = parseCsvTsv(text)

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid rows found in file' }), { status: 400 })
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse request' }), { status: 400 })
  }

  const encoder = new TextEncoder()

  function emit(controller: ReadableStreamDefaultController, obj: object) {
    controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
  }

  const stream = new ReadableStream({
    async start(controller) {
      const total = rows.length

      for (let i = 0; i < total; i++) {
        const { filename, prompt } = rows[i]
        const fullFilename = `${filename}.webp`

        emit(controller, { type: 'progress', index: i, total, filename: fullFilename })

        try {
          const fullPrompt = styleRules
            ? `${prompt}\n\n${styleRules}`
            : prompt

          const webpBuffer = await generateAndCrop(fullPrompt)
          const b64 = webpBuffer.toString('base64')

          emit(controller, { type: 'image', filename: fullFilename, data: b64 })
        } catch (err) {
          emit(controller, {
            type: 'image_error',
            filename: fullFilename,
            message: err instanceof Error ? err.message : 'Generation failed',
          })
        }
      }

      emit(controller, { type: 'done', total })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  })
}
