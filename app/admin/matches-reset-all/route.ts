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
        live_score_a: 0,
        live_score_b: 0,
        score_a: null,
        score_b: null,
        status: null,
        started_at: null,
        ended_at: null,
        referee_note: null,
      })
      .neq('id', 0)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}