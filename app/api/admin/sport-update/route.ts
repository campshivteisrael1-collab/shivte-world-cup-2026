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

    const updateData = {
      name: body.name,
      display_name: body.display_name,
      location: body.location,
      rules: body.rules,
    }

    const { error } = await supabase
      .from('Sports')
      .update(updateData)
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