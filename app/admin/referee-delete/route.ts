import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { profileId } = await req.json()

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId requerido' },
        { status: 400 }
      )
    }

    const { error: clearMatchesError } = await supabase
      .from('matches')
      .update({ referee_id: null })
      .eq('referee_id', profileId)

    if (clearMatchesError) {
      return NextResponse.json(
        { error: clearMatchesError.message },
        { status: 500 }
      )
    }

    const { error } = await supabase
      .from('referees')
      .delete()
      .eq('profile_id', profileId)

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