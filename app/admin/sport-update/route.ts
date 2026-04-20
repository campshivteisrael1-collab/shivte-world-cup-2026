import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const {
      sportId,
      name,
      display_name,
      location,
      referees_display,
      rules,
    } = await req.json()

    if (!sportId) {
      return NextResponse.json(
        { error: 'sportId requerido' },
        { status: 400 }
      )
    }

    if (!name || !display_name) {
      return NextResponse.json(
        { error: 'Nombre interno y nombre visible son requeridos' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('Sports')
      .update({
        name: String(name).trim(),
        display_name: String(display_name).trim(),
        location: location ? String(location).trim() : null,
        referees_display: referees_display
          ? String(referees_display).trim()
          : null,
        rules: rules ? String(rules).trim() : null,
      })
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
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}