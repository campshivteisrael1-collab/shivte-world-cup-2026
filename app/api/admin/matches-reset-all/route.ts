import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const { data: matches, error: fetchError } = await supabase
      .from('matches')
      .select('id')

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      )
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No hay partidos para reiniciar',
      })
    }

    const ids = matches.map((m) => m.id)

    const { error: updateError } = await supabase
      .from('matches')
      .update({
        live_score_a: 0,
        live_score_b: 0,
        score_a: null,
        score_b: null,
        status: 'pending',
        started_at: null,
      })
      .in('id', ids)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Torneo reiniciado correctamente',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo reiniciar el torneo' },
      { status: 500 }
    )
  }
}