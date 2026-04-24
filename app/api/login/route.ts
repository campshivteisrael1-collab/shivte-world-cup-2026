import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const username = String(body.username || '').trim().toLowerCase()
    const password = String(body.password || '').trim()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña requeridos' },
        { status: 400 }
      )
    }

    const { data: referee, error } = await supabase
      .from('referees')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single()

    if (error || !referee) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 401 }
      )
    }

    const passwordOk = await bcrypt.compare(password, referee.password)

    if (!passwordOk) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      )
    }

    const token = crypto.randomUUID()

    await supabase.from('referee_sessions').insert({
      token,
      referee_id: referee.id,
      profile_id: referee.profile_id,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    })

    const response = NextResponse.json({
      success: true,
      referee,
    })

    response.cookies.set('session', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    })

    return response
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno' },
      { status: 500 }
    )
  }
}