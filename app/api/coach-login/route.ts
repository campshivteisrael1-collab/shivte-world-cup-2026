import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    const { data: coach } = await supabase
      .from('coaches')
      .select('*')
      .eq('username', username)
      .single()

    if (!coach || coach.password !== password) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const token = crypto.randomBytes(32).toString('hex')

    await supabase.from('coach_sessions').insert({
      token,
      coach_id: coach.id,
    })

    const res = NextResponse.json({ success: true })

    res.cookies.set('coach_session', token, {
      httpOnly: true,
      path: '/',
    })

    return res
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno' },
      { status: 500 }
    )
  }
}