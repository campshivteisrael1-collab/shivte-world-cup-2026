import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_session')?.value

    if (token) {
      await supabase.from('admin_sessions').delete().eq('token', token)
    }

    const res = NextResponse.json({ success: true })

    res.cookies.set('admin_session', '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    })

    return res
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}