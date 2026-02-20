import { google } from 'googleapis'
import { createServiceClient } from '@/lib/supabase/server'

export async function getAdminOAuthClient() {
  const service = await createServiceClient()
  const { data, error } = await service
    .from('admin_google_token')
    .select('access_token, refresh_token, expiry_date')
    .eq('id', 1)
    .single()

  if (error || !data) {
    throw new Error(
      'Google OAuth not connected. Go to /admin and connect your Google account.'
    )
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Number(data.expiry_date),
  })

  oauth2.on('tokens', async (tokens) => {
    const updates: Record<string, string | number> = {
      updated_at: new Date().toISOString(),
    }
    if (tokens.access_token) updates.access_token = tokens.access_token
    if (tokens.expiry_date) updates.expiry_date = tokens.expiry_date
    await service.from('admin_google_token').update(updates).eq('id', 1)
  })

  return oauth2
}
