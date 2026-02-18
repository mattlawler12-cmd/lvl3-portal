'use server'

import { cookies } from 'next/headers'

const COOKIE_NAME = 'selected_client'
const MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export async function setSelectedClient(clientId: string | null) {
  const cookieStore = await cookies()

  if (clientId) {
    cookieStore.set(COOKIE_NAME, clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE,
    })
  } else {
    cookieStore.delete(COOKIE_NAME)
  }
}
