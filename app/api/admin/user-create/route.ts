import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      name,
      username,
      password,
      is_super_admin,
      can_manage_matches,
      can_manage_teams,
      can_manage_sports,
      can_manage_referees,
      can_manage_users,
      can_reset_tournament,
    } = body

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('admin_users').insert({
      name,
      username,
      password, // luego lo encriptamos
      is_super_admin: !!is_super_admin,
      can_manage_matches: !!can_manage_matches,
      can_manage_teams: !!can_manage_teams,
      can_manage_sports: !!can_manage_sports,
      can_manage_referees: !!can_manage_referees,
      can_manage_users: !!can_manage_users,
      can_reset_tournament: !!can_reset_tournament,
      is_active: true,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno' },
      { status: 500 }
    )
  }
}