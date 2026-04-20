import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: session } = await supabase
      .from('referee_sessions')
      .select('*')
      .eq('token', token)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    const { matchId, refereeNote } = await req.json()

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, referee_id, status')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }

    if (match.referee_id !== session.profile_id) {
      return NextResponse.json({ error: 'No puedes editar este partido' }, { status: 403 })
    }

    if (match.status === 'submitted') {
      return NextResponse.json(
        { error: 'Este partido ya fue capturado y no puede editarse' },
        { status: 403 }
      )
    }

    const { error: updateError } = await supabase
      .from('matches')
      .update({
        referee_note: refereeNote || null,
      })
      .eq('id', matchId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}