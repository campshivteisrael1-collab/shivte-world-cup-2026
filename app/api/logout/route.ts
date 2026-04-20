import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (token) {
    await supabase
      .from('referee_sessions')
      .delete()
      .eq('token', token)
  }

  const response = NextResponse.json({ success: true })

  response.cookies.set('session', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
  })

  return response
}