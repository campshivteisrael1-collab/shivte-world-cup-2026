import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    const updateData: any = {
      name: body.name,
      username: body.username,
      is_active: !!body.is_active,
      is_super_admin: !!body.is_super_admin,
      can_manage_matches: !!body.can_manage_matches,
      can_manage_teams: !!body.can_manage_teams,
      can_manage_sports: !!body.can_manage_sports,
      can_manage_referees: !!body.can_manage_referees,
      can_manage_users: !!body.can_manage_users,
      can_reset_tournament: !!body.can_reset_tournament,
    }

    if (body.password && String(body.password).trim() !== '') {
      updateData.password = String(body.password)
    }

    const { error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', body.id)

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