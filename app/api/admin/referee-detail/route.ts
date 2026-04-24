import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  }

  const { data: referee, error } = await supabase
    .from('referees')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: sports } = await supabase
    .from('Sports')
    .select('*')
    .order('id')

  return NextResponse.json({
    referee,
    sports: sports || [],
  })
}