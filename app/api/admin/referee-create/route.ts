import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { name, username, password, sport_id } = await req.json()

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Nombre, usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const cleanSportId =
      sport_id === '' ||
      sport_id === null ||
      sport_id === undefined
        ? null
        : Number(sport_id)

    const { error } = await supabase
      .from('referees')
      .insert({
        name: String(name).trim(),
        username: String(username).trim(),
        password: String(password),
        sport_id: cleanSportId,
        is_active: true,
      })

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