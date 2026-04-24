import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.name || !body.display_name) {
      return NextResponse.json(
        { error: 'Nombre interno y nombre visible son obligatorios' },
        { status: 400 }
      )
    }

    const { data: lastSport, error: lastSportError } = await supabase
      .from('Sports')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single()

    if (lastSportError) {
      return NextResponse.json(
        { error: lastSportError.message },
        { status: 500 }
      )
    }

    const nextId = Number(lastSport.id) + 1

    const { error } = await supabase.from('Sports').insert({
      id: nextId,
      name: body.name,
      display_name: body.display_name,
      location: body.location || '',
      rules: body.rules || '',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno' },
      { status: 500 }
    )
  }
}