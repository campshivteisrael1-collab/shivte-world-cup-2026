import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const sportId = body.sportId || body.id

    if (!sportId) {
      return NextResponse.json(
        { error: 'sportId requerido' },
        { status: 400 }
      )
    }

    const { count: matchesCount, error: matchesError } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('sport_id', sportId)

    if (matchesError) {
      return NextResponse.json(
        { error: matchesError.message },
        { status: 500 }
      )
    }

    if ((matchesCount || 0) > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede borrar este deporte porque tiene partidos asignados.',
        },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('Sports')
      .delete()
      .eq('id', sportId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno' },
      { status: 500 }
    )
  }
}