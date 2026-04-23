import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    if (teamsError) {
      return NextResponse.json(
        { error: teamsError.message },
        { status: 500 }
      )
    }

    const { data: players, error: playersError } = await supabase
      .from('team_players')
      .select('*')

    if (playersError) {
      return NextResponse.json(
        { error: playersError.message },
        { status: 500 }
      )
    }

    const merged = (teams || []).map((team: any) => {
      const teamPlayers = (players || [])
        .filter((p: any) => String(p.team_id) === String(team.id))
        .map((p: any) => p.player_name)

      return {
        ...team,
        players: teamPlayers,
      }
    })

    return NextResponse.json({ teams: merged })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error interno' },
      { status: 500 }
    )
  }
}