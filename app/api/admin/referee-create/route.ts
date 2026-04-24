import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, username, password, sportId, isActive } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    }

    if (!username || !String(username).trim()) {
      return NextResponse.json({ error: 'Usuario requerido' }, { status: 400 })
    }

    if (!password || !String(password).trim()) {
      return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
    }

    if (!sportId) {
      return NextResponse.json({ error: 'Deporte requerido' }, { status: 400 })
    }

    const cleanUsername = String(username).trim().toLowerCase()
    const hashedPassword = await bcrypt.hash(String(password), 10)

    const { error } = await supabase
      .from('referees')
      .insert({
        name: String(name).trim(),
        username: cleanUsername,
        password: hashedPassword,
        sport_id: Number(sportId),
        is_active: isActive === false ? false : true,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
