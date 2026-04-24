import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const refereeId = body.refereeId || body.id

    if (!refereeId) {
      return NextResponse.json(
        { error: 'refereeId requerido' },
        { status: 400 }
      )
    }

    const updateData: any = {
      name: body.name,
      username: body.username,
      sport_id: body.sport_id ?? null,
      is_active: body.is_active,
    }

    if (body.password && String(body.password).trim() !== '') {
      updateData.password = await bcrypt.hash(String(body.password), 10)
    }

    const { error } = await supabase
      .from('referees')
      .update(updateData)
      .eq('id', refereeId)

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