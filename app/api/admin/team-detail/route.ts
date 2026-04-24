import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'teamId requerido' }, { status: 400 })
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { error: teamError?.message || 'Equipo no encontrado' },
        { status: 500 }
      )
    }

    const { data: players, error: playersError } = await supabase
      .from('team_players')
      .select('player_name')
      .eq('team_id', teamId)
      .order('player_name')

    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 })
    }

    return NextResponse.json({
      team,
      players: players || [],
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno' },
      { status: 500 }
    )
  }
}