'use server'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AskResult = {
  reply?: string
  error?: string
}
