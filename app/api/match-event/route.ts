import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getToken(req: NextRequest) {
  return (
    req.cookies.get('referee_session')?.value ||
    req.cookies.get('referee_session_token')?.value ||
    req.cookies.get('session')?.value ||
    req.cookies.get('token')?.value ||
    ''
  )
}

async function validateRefereeCanEditMatch(req: NextRequest, matchId: string) {
  const token = getToken(req)

  if (!token) {
    return { ok: false, error: 'No hay sesión de árbitro' }
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('referee_sessions')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (sessionError || !session) {
    return { ok: false, error: 'Sesión inválida' }
  }

  const { data: match, error: matchError } = await supabaseAdmin
    .from('matches')
    .select('id, referee_id, status')
    .eq('id', matchId)
    .maybeSingle()

  if (matchError || !match) {
    return { ok: false, error: 'Partido no encontrado' }
  }

  if (match.referee_id !== session.referee_id) {
    return { ok: false, error: 'No puedes editar este partido' }
  }

  if (match.status === 'submitted') {
    return { ok: false, error: 'Este partido ya fue finalizado' }
  }

  return { ok: true, session, match }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const matchId = searchParams.get('matchId')

  if (!matchId) {
    return NextResponse.json({ error: 'Falta matchId' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('match_events')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: data || [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const matchId = body.matchId

    if (!matchId) {
      return NextResponse.json({ error: 'Falta matchId' }, { status: 400 })
    }

    const validation = await validateRefereeCanEditMatch(req, matchId)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 403 })
    }

    const payload = {
      match_id: matchId,
      event_type: body.eventType,
      stage: body.stage ?? null,
      minute: body.minute ?? null,
      team_side: body.teamSide ?? 'neutral',
      team_id: body.teamId ?? null,
      team_name: body.teamName ?? null,
      player: body.player ?? null,
      note: body.note ?? null,
      score_a: body.scoreA ?? null,
      score_b: body.scoreB ?? null,
      penalty_a: body.penaltyA ?? null,
      penalty_b: body.penaltyB ?? null,
    }

    if (!payload.event_type) {
      return NextResponse.json({ error: 'Falta eventType' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('match_events')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'No se pudo guardar el evento' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const eventId = body.eventId
    const matchId = body.matchId
    const deleteAll = Boolean(body.deleteAll)

    if ((!eventId && !deleteAll) || !matchId) {
      return NextResponse.json({ error: 'Falta eventId o matchId' }, { status: 400 })
    }

    const validation = await validateRefereeCanEditMatch(req, matchId)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 403 })
    }

    let query = supabaseAdmin
      .from('match_events')
      .delete()
      .eq('match_id', matchId)

    if (!deleteAll) {
      query = query.eq('id', eventId)
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'No se pudo borrar el evento' },
      { status: 500 }
    )
  }
}
