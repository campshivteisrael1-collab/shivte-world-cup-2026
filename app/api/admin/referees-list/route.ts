import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: referees, error: refereesError } = await supabase
      .from('referees')
      .select('*')
      .order('username')

    if (refereesError) {
      return NextResponse.json({ error: refereesError.message }, { status: 500 })
    }

    const { data: sports, error: sportsError } = await supabase
      .from('Sports')
      .select('*')
      .order('id')

    if (sportsError) {
      return NextResponse.json({ error: sportsError.message }, { status: 500 })
    }

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id, referee_id')

    if (matchesError) {
      return NextResponse.json({ error: matchesError.message }, { status: 500 })
    }

    return NextResponse.json({
      referees: referees || [],
      sports: sports || [],
      matches: matches || [],
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno' },
      { status: 500 }
    )
  }
}