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

    const { matchId } = await req.json()

    const { data: refereeMatches } = await supabase
      .from('matches')
      .select('id, status, match_code')
      .eq('referee_id', session.profile_id)
      .order('match_code', { ascending: true })

    const nextPendingId =
      refereeMatches?.find((m: any) => m.status !== 'submitted')?.id ?? null

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, referee_id, status, started_at')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }

    if (match.referee_id !== session.profile_id) {
      return NextResponse.json({ error: 'No puedes iniciar este partido' }, { status: 403 })
    }

    if (match.status === 'submitted') {
      return NextResponse.json({ error: 'Este partido ya fue cerrado' }, { status: 403 })
    }

    if (nextPendingId !== match.id) {
      return NextResponse.json(
        { error: 'Primero debes capturar la jornada anterior' },
        { status: 403 }
      )
    }

    if (match.started_at) {
      return NextResponse.json({ success: true, started_at: match.started_at })
    }

    const now = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('matches')
      .update({ started_at: now })
      .eq('id', matchId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, started_at: now })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}