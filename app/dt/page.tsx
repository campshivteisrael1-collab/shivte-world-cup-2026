import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import LiveMatchView from './live-match-view'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function DTPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('coach_session')?.value

  if (!token) return <div>No autorizado</div>

  const { data: session } = await supabase
    .from('coach_sessions')
    .select('*')
    .eq('token', token)
    .single()

  if (!session) return <div>Sesión inválida</div>

  const { data: coach } = await supabase
    .from('coaches')
    .select('*')
    .eq('id', session.coach_id)
    .single()

  if (!coach) return <div>Coach no encontrado</div>

  const { data: allMatches } = await supabase
    .from('matches')
    .select('*')

  const { data: teams } = await supabase.from('teams').select('*')
  const { data: sports } = await supabase.from('Sports').select('*')

  const { data: restSchedule } = await supabase
    .from('rest_schedule')
    .select('*')

  const jornadasMap: Record<string, any[]> = {}

  allMatches?.forEach((m: any) => {
    const jornada = m.match_code.split('-')[0]

    if (!jornadasMap[jornada]) {
      jornadasMap[jornada] = []
    }

    jornadasMap[jornada].push(m)
  })

  const jornadas = Object.keys(jornadasMap).sort()

  const esJornadaRegular = (jornada: string) => /^J\d+/.test(jornada)

  const finalList = jornadas.map((jornada) => {
    const matches = jornadasMap[jornada]

    const equiposJugando = new Set<number>()

    matches.forEach((m: any) => {
      equiposJugando.add(m.team_a_id)
      equiposJugando.add(m.team_b_id)
    })

    if (esJornadaRegular(jornada) && !equiposJugando.has(coach.team_id)) {
      const rest = restSchedule?.find((r: any) => r.jornada === jornada)

      return {
        isRest: true,
        jornada,
        horario: rest?.horario,
      }
    }

    const match = matches.find(
      (m: any) =>
        m.team_a_id === coach.team_id ||
        m.team_b_id === coach.team_id
    )

    if (!match) {
      return null
    }

    const teamA = teams?.find((t: any) => t.id === match.team_a_id)
    const teamB = teams?.find((t: any) => t.id === match.team_b_id)
    const sport = sports?.find((s: any) => s.id === match.sport_id)

    return {
      ...match,
      teamA,
      teamB,
      sport,
    }
  }).filter(Boolean)

  return (
    <main style={{ padding: 20, maxWidth: 500, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20 }}>{coach.name}</h1>

      {finalList.map((item: any, i: number) =>
        item.isRest ? (
          <div
            key={i}
            style={{
              borderRadius: 16,
              padding: 18,
              marginBottom: 16,
              background: '#fff3cd',
              border: '1px solid #ddd',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>
              {item.jornada} — DESCANSO
            </div>

            {item.horario && (
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                {item.horario}
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              Tu equipo no juega en esta jornada
            </div>
          </div>
        ) : (
          <LiveMatchView key={item.id} match={item} />
        )
      )}
    </main>
  )
}