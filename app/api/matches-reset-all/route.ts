import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const { error } = await supabase
      .from('matches')
      .update({
        score_a: 0,
        score_b: 0,
        live_score_a: 0,
        live_score_b: 0,
        status: 'pending',
        referee_note: null,
        started_at: null,
        ended_at: null,
      })
      .neq('id', 0)

    if (error) {
      return NextResponse.json(
        { error: error.message || 'No se pudo reiniciar el torneo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo reiniciar el torneo' },
      { status: 500 }
    )
  }
}