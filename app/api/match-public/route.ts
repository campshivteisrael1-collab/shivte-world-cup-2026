import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  const { data } = await supabase
    .from('matches')
    .select(`
      id,
      live_score_a,
      live_score_b,
      status,
      started_at
    `)
    .eq('id', id)
    .single()

  return NextResponse.json(data)
}