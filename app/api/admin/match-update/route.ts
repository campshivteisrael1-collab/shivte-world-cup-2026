import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, matchId, payload } = body

    if (!matchId) {
      return NextResponse.json(
        { error: 'matchId requerido' },
        { status: 400 }
      )
    }

    if (action === 'save') {
      const updatePayload = {
        team_a_id: Number(payload.team_a_id),
        team_b_id: Number(payload.team_b_id),
        sport_id: Number(payload.sport_id),
        phase: payload.phase || 'regular',
        match_time: payload.match_time || null,
        referee_id: payload.referee_id || null,
        live_score_a: Number(payload.live_score_a ?? 0),
        live_score_b: Number(payload.live_score_b ?? 0),
        score_a:
          payload.score_a === '' || payload.score_a === null || payload.score_a === undefined
            ? null
            : Number(payload.score_a),
        score_b:
          payload.score_b === '' || payload.score_b === null || payload.score_b === undefined
            ? null
            : Number(payload.score_b),
        status: payload.status || null,
        started_at: payload.started_at || null,
        ended_at: payload.ended_at || null,
        referee_note: payload.referee_note || null,
      }

      const { error } = await supabase
        .from('matches')
        .update(updatePayload)
        .eq('id', matchId)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true, message: 'Guardado correctamente' })
    }

    if (action === 'reset') {
      const { error } = await supabase
        .from('matches')
        .update({
          live_score_a: 0,
          live_score_b: 0,
          score_a: null,
          score_b: null,
          status: null,
          started_at: null,
          ended_at: null,
          referee_note: null,
        })
        .eq('id', matchId)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true, message: 'Partido reiniciado' })
    }

    if (action === 'clearFinal') {
      const { error } = await supabase
        .from('matches')
        .update({
          score_a: null,
          score_b: null,
          status: null,
          ended_at: null,
        })
        .eq('id', matchId)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true, message: 'Resultado final borrado' })
    }

    if (action === 'cancel') {
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'cancelled',
        })
        .eq('id', matchId)

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ ok: true, message: 'Partido cancelado' })
    }

    return NextResponse.json(
      { error: 'Acción inválida' },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error interno' },
      { status: 500 }
    )
  }
}