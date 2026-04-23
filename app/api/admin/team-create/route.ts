import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, coachName, logoUrl, playerNames } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: 'Falta el nombre del equipo' },
        { status: 400 }
      )
    }

    const { data: createdTeam, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: String(name).trim(),
        coach_name: coachName ? String(coachName).trim() : null,
        logo_url: logoUrl ? String(logoUrl).trim() : null,
      })
      .select('*')
      .single()

    if (teamError || !createdTeam) {
      return NextResponse.json(
        { error: teamError?.message || 'No se pudo crear el equipo' },
        { status: 500 }
      )
    }

    const cleanPlayers = Array.isArray(playerNames)
      ? playerNames.map((p) => String(p).trim()).filter(Boolean)
      : []

    if (cleanPlayers.length > 0) {
      const rows = cleanPlayers.map((playerName) => ({
        team_id: createdTeam.id,
        player_name: playerName,
      }))

      const { error: playersError } = await supabase
        .from('team_players')
        .insert(rows)

      if (playersError) {
        return NextResponse.json(
          { error: playersError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ ok: true, team: createdTeam })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error interno' },
      { status: 500 }
    )
  }
}