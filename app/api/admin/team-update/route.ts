import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { teamId, name, coachName, logoUrl, playerNames } = body

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId requerido' },
        { status: 400 }
      )
    }

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: 'Nombre del equipo requerido' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('teams')
      .update({
        name: String(name).trim(),
        coach_name: coachName ? String(coachName).trim() : null,
        logo_url: logoUrl ? String(logoUrl).trim() : null,
      })
      .eq('id', teamId)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    const { error: deletePlayersError } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', teamId)

    if (deletePlayersError) {
      return NextResponse.json(
        { error: deletePlayersError.message },
        { status: 500 }
      )
    }

    const cleanPlayers = Array.isArray(playerNames)
      ? playerNames.map((x) => String(x).trim()).filter(Boolean)
      : []

    if (cleanPlayers.length > 0) {
      const rows = cleanPlayers.map((playerName) => ({
        team_id: teamId,
        player_name: playerName,
      }))

      const { error: insertPlayersError } = await supabase
        .from('team_players')
        .insert(rows)

      if (insertPlayersError) {
        return NextResponse.json(
          { error: insertPlayersError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}