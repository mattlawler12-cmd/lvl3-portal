import { NextRequest, NextResponse } from 'next/server'
import { connectAdminGoogle } from '@/app/actions/admin-google'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      `${origin}/admin?google=error&reason=${encodeURIComponent(error ?? 'no_code')}`
    )
  }

  const redirectUri = `${origin}/auth/google-callback`
  const result = await connectAdminGoogle(code, redirectUri)

  if (result.error) {
    return NextResponse.redirect(
      `${origin}/admin?google=error&reason=${encodeURIComponent(result.error)}`
    )
  }

  return NextResponse.redirect(`${origin}/admin?google=connected`)
}
