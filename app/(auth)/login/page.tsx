'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [usePassword, setUsePassword] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <span className="text-surface-100 text-4xl font-bold tracking-tight">
            LVL3
          </span>
          <p className="mt-2 text-surface-400 text-sm">Client Portal</p>
        </div>

        {submitted ? (
          <div className="bg-surface-900 border border-surface-700 rounded-xl p-6 text-center space-y-2">
            <p className="text-surface-100 font-medium">Check your email</p>
            <p className="text-surface-400 text-sm">
              We sent a magic link to <span className="text-surface-100">{email}</span>.
              Click it to sign in.
            </p>
          </div>
        ) : usePassword ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="flex items-center justify-end mb-1">
              <button
                type="button"
                onClick={() => { setUsePassword(false); setError(null) }}
                className="text-xs text-brand-400 hover:text-surface-200 transition-colors"
              >
                Use magic link instead
              </button>
            </div>

            <div>
              <label htmlFor="email-pw" className="block text-sm font-medium text-surface-300 mb-1.5">
                Email address
              </label>
              <input
                id="email-pw"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-surface-900 border border-surface-600 rounded-lg px-4 py-2.5 text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-surface-600 text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-900 border border-surface-600 rounded-lg px-4 py-2.5 text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-surface-600 text-sm"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-400 hover:bg-brand-500 text-surface-950 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in with password'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-surface-300 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-surface-900 border border-surface-600 rounded-lg px-4 py-2.5 text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-surface-600 text-sm"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-400 hover:bg-brand-500 text-surface-950 font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>

            <button
              type="button"
              onClick={() => { setUsePassword(true); setError(null) }}
              className="w-full text-xs text-brand-400 hover:text-surface-200 transition-colors py-1"
            >
              Sign in with password instead
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
