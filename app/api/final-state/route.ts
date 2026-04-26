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
    .from('match_final_state')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ state: data || null })
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
      stage: body.stage || 'first_half',
      stage_started_at: body.stageStartedAt ?? null,
      added_seconds: Number(body.addedSeconds || 0),
      pause_started_at: body.pauseStartedAt ?? null,
      pause_reason: body.pauseReason || '',
      penalty_a: Number(body.penaltyA || 0),
      penalty_b: Number(body.penaltyB || 0),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('match_final_state')
      .upsert(payload, { onConflict: 'match_id' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ state: data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'No se pudo guardar el estado de la final' },
      { status: 500 }
    )
  }
}
