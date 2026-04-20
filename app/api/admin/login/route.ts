import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña requeridos' },
        { status: 400 }
      )
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', String(username).trim())
      .eq('password', String(password))
      .single()

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      )
    }

    const token = crypto.randomUUID()

    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        token,
        admin_id: admin.id,
      })

    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 }
      )
    }

    const res = NextResponse.json({ success: true })

    res.cookies.set('admin_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })

    return res
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}