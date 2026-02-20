'use server'

import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export async function getAdminGoogleStatus(): Promise<{
  connected: boolean
  email?: string
}> {
  try {
    await requireAdmin()
    const service = await createServiceClient()
    const { data } = await service
      .from('admin_google_token')
      .select('email')
      .eq('id', 1)
      .single()
    return data ? { connected: true, email: data.email ?? undefined } : { connected: false }
  } catch {
    return { connected: false }
  }
}

export async function connectAdminGoogle(
  code: string,
  redirectUri: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin()

    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    )

    const { tokens } = await oauth2.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return {
        error:
          'OAuth did not return required tokens. Make sure you approved all permissions and that offline access was requested.',
      }
    }

    oauth2.setCredentials(tokens)
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 })
    const { data: userInfo } = await oauth2Api.userinfo.get()

    const service = await createServiceClient()
    const { error } = await service.from('admin_google_token').upsert(
      {
        id: 1,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date ?? Date.now() + 3600000,
        email: userInfo.email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'OAuth exchange failed' }
  }
}

export async function disconnectAdminGoogle(): Promise<{ error?: string }> {
  try {
    await requireAdmin()
    const service = await createServiceClient()
    await service.from('admin_google_token').delete().eq('id', 1)
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to disconnect' }
  }
}
