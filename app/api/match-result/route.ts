import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getWinnerTeamId(match: any, forcedWinnerTeamId?: any) {
  const scoreA = Number(match.live_score_a ?? 0)
  const scoreB = Number(match.live_score_b ?? 0)

  if (scoreA > scoreB) return match.team_a_id
  if (scoreB > scoreA) return match.team_b_id

  if (forcedWinnerTeamId) return Number(forcedWinnerTeamId)

  return null
}

function sortKnockoutMatches(a: any, b: any) {
  const codeA = String(a.match_code || '')
  const codeB = String(b.match_code || '')

  if (codeA && codeB && codeA !== codeB) {
    return codeA.localeCompare(codeB, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }

  const timeA = String(a.match_time || '')
  const timeB = String(b.match_time || '')

  return timeA.localeCompare(timeB, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

async function advanceWinner(match: any, winnerTeamId: number) {
  if (match.phase === 'quarterfinal') {
    const { data: quarterfinals, error: qfError } = await supabase
      .from('matches')
      .select('*')
      .eq('sport_id', match.sport_id)
      .eq('phase', 'quarterfinal')

    if (qfError) throw new Error(qfError.message)

    const { data: semifinals, error: sfError } = await supabase
      .from('matches')
      .select('*')
      .eq('sport_id', match.sport_id)
      .eq('phase', 'semifinal')

    if (sfError) throw new Error(sfError.message)

    const orderedQuarterfinals = (quarterfinals || []).sort(sortKnockoutMatches)
    const orderedSemifinals = (semifinals || []).sort(sortKnockoutMatches)

    const quarterIndex = orderedQuarterfinals.findIndex(
      (quarterfinal: any) => String(quarterfinal.id) === String(match.id)
    )

    if (quarterIndex === -1) return

    const semifinalIndex = quarterIndex < 2 ? 0 : 1
    const semifinalSlot = quarterIndex % 2 === 0 ? 'team_a_id' : 'team_b_id'
    const semifinal = orderedSemifinals[semifinalIndex]

    if (!semifinal) return

    const { error: updateSemiError } = await supabase
      .from('matches')
      .update({
        [semifinalSlot]: winnerTeamId,
      })
      .eq('id', semifinal.id)

    if (updateSemiError) throw new Error(updateSemiError.message)
  }

  if (match.phase === 'semifinal') {
    const { data: semifinals, error: sfError } = await supabase
      .from('matches')
      .select('*')
      .eq('sport_id', match.sport_id)
      .eq('phase', 'semifinal')

    if (sfError) throw new Error(sfError.message)

    const { data: finals, error: finalError } = await supabase
      .from('matches')
      .select('*')
      .eq('sport_id', match.sport_id)
      .eq('phase', 'final')

    if (finalError) throw new Error(finalError.message)

    const orderedSemifinals = (semifinals || []).sort(sortKnockoutMatches)
    const orderedFinals = (finals || []).sort(sortKnockoutMatches)

    const semifinalIndex = orderedSemifinals.findIndex(
      (semifinal: any) => String(semifinal.id) === String(match.id)
    )

    if (semifinalIndex === -1) return

    const finalMatch = orderedFinals[0]
    if (!finalMatch) return

    const finalSlot = semifinalIndex === 0 ? 'team_a_id' : 'team_b_id'

    const { error: updateFinalError } = await supabase
      .from('matches')
      .update({
        [finalSlot]: winnerTeamId,
      })
      .eq('id', finalMatch.id)

    if (updateFinalError) throw new Error(updateFinalError.message)
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: session, error: sessionError } = await supabase
      .from('referee_sessions')
      .select('*')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    const refereeId = session.referee_id

    if (!refereeId) {
      return NextResponse.json(
        { error: 'Sesión inválida: referee_id requerido' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { matchId, refereeNote, winnerTeamId, resolution } = body

    const { data: refereeMatches } = await supabase
      .from('matches')
      .select('id, status, match_code, phase, match_time, score_a, score_b')
      .eq('referee_id', refereeId)
      .order('match_code', { ascending: true })

    const sortedRefereeMatches = (refereeMatches || []).sort(sortKnockoutMatches)

    const nextPendingId =
      sortedRefereeMatches.find(
        (m: any) =>
          m.status !== 'submitted' &&
          (
            m.score_a === null ||
            m.score_a === undefined ||
            m.score_b === null ||
            m.score_b === undefined
          )
      )?.id ?? null

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(
        'id, sport_id, phase, match_code, match_time, team_a_id, team_b_id, referee_id, status, started_at, live_score_a, live_score_b'
      )
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }

    if (String(match.referee_id) !== String(refereeId)) {
      return NextResponse.json({ error: 'No puedes editar este partido' }, { status: 403 })
    }

    if (match.status === 'submitted') {
      return NextResponse.json(
        { error: 'Este partido ya fue capturado y no puede editarse' },
        { status: 403 }
      )
    }

    if (nextPendingId !== match.id) {
      return NextResponse.json(
        { error: 'Primero debes capturar la jornada anterior' },
        { status: 403 }
      )
    }

    if (!match.started_at) {
      return NextResponse.json(
        { error: 'Debes iniciar el partido antes de guardar el resultado' },
        { status: 403 }
      )
    }

    const finalScoreA = Number(match.live_score_a ?? 0)
    const finalScoreB = Number(match.live_score_b ?? 0)

    const isKnockout =
      match.phase === 'quarterfinal' ||
      match.phase === 'semifinal' ||
      match.phase === 'final'

    const winner = getWinnerTeamId(match, winnerTeamId)

    if (isKnockout && !winner) {
      return NextResponse.json(
        { error: 'En eliminatorias no puede haber empate. Define un ganador.' },
        { status: 400 }
      )
    }

    const cleanResolution =
      resolution === 'extra_time' || resolution === 'penalties'
        ? resolution
        : 'regular'

    const resolutionText =
      cleanResolution === 'extra_time'
        ? 'Definido en tiempo extra'
        : cleanResolution === 'penalties'
          ? 'Definido por penales'
          : null

    const cleanNote = [refereeNote || null, resolutionText]
      .filter(Boolean)
      .join('\n')

    const { error: updateError } = await supabase
      .from('matches')
      .update({
        score_a: finalScoreA,
        score_b: finalScoreB,
        winner_team_id: winner || null,
        status: 'submitted',
        referee_note: cleanNote || null,
        ended_at: new Date().toISOString(),
      })
      .eq('id', matchId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (
      winner &&
      (match.phase === 'quarterfinal' || match.phase === 'semifinal')
    ) {
      await advanceWinner(match, winner)
    }

    return NextResponse.json({
      success: true,
      score_a: finalScoreA,
      score_b: finalScoreB,
      winner_team_id: winner || null,
      resolution: cleanResolution,
      status: 'submitted',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}