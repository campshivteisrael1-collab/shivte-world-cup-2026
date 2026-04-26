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

    const refereeId = session.referee_id

    if (!refereeId) {
      return NextResponse.json(
        { error: 'Sesión inválida: referee_id requerido' },
        { status: 401 }
      )
    }

    const { matchId, scoreA, scoreB } = await req.json()

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, referee_id, status, started_at')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        { error: 'Partido no encontrado' },
        { status: 404 }
      )
    }

    if (String(match.referee_id) !== String(refereeId)) {
      return NextResponse.json(
        { error: 'No puedes editar este partido' },
        { status: 403 }
      )
    }

    if (match.status === 'submitted') {
      return NextResponse.json(
        { error: 'El partido ya fue finalizado' },
        { status: 403 }
      )
    }

    if (!match.started_at) {
      return NextResponse.json(
        { error: 'Debes iniciar el partido antes de mover el marcador' },
        { status: 403 }
      )
    }

    const cleanScoreA = Number(scoreA ?? 0)
    const cleanScoreB = Number(scoreB ?? 0)

    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update({
        live_score_a: cleanScoreA,
        live_score_b: cleanScoreB,
      })
      .eq('id', matchId)
      .select('live_score_a, live_score_b')
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      live_score_a: updatedMatch.live_score_a,
      live_score_b: updatedMatch.live_score_b,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}