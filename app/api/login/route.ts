import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { username, password } = await req.json()

  const { data, error } = await supabase.rpc('referee_login', {
    p_username: username,
    p_password: password,
  })

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const referee = data[0]

  const token = crypto.randomUUID()

  await supabase.from('referee_sessions').insert({
    token,
    referee_id: referee.referee_id,
    profile_id: referee.profile_id,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 8), // 8 horas
  })

  const response = NextResponse.json({ success: true })

  response.cookies.set('session', token, {
    httpOnly: true,
    path: '/',
  })

  return response
}