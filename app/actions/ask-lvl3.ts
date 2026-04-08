'use server'

export type ChatArtifact = {
  path: string
  filename: string
  mimeType: string
  url?: string // signed URL — generated fresh on load
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  artifacts?: ChatArtifact[]
}

export type AskResult = {
  reply?: string
  error?: string
}
