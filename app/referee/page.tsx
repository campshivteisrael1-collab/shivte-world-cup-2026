import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import LogoutButton from './logout-button'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getMatchTitle(match: any) {
  if (match.phase === 'regular') {
    const jornada = match.match_code?.split('-')[0]?.replace('J', '')
    return `Jornada ${jornada} — Fase regular`
  }

  if (match.phase === 'quarterfinal') return 'Cuartos de final'
  if (match.phase === 'semifinal') return 'Semifinal'
  if (match.phase === 'final') return 'Final'

  return match.phase || 'Partido'
}

function TeamMini({
  name,
  logo,
}: {
  name: string
  logo?: string | null
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {logo ? (
        <img
          src={logo}
          alt={name}
          style={{
            width: 24,
            height: 24,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : null}
      <span>{name}</span>
    </div>
  )
}

export default async function RefereePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) {
    return <div>No autorizado</div>
  }

  const { data: session } = await supabase
    .from('referee_sessions')
    .select('*')
    .eq('token', token)
    .single()

  if (!session) {
    return <div>Sesión inválida</div>
  }

  const { data: referee } = await supabase
    .from('referees')
    .select('name')
    .eq('profile_id', session.profile_id)
    .single()

  const { data: matches, error } = await supabase
    .from('matches_view')
    .select('*')
    .eq('referee_id', session.profile_id)
    .order('match_code', { ascending: true })

  const nextPendingId =
    matches?.find((m: any) => m.status !== 'submitted')?.id ?? null

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'Arial, sans-serif',
        maxWidth: 900,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Mis partidos</h1>
          <p style={{ marginTop: 8, color: '#666' }}>
            {referee?.name || 'Árbitro'}
          </p>
        </div>

        <LogoutButton />
      </div>

      {error && <p style={{ color: 'red' }}>Error: {JSON.stringify(error)}</p>}

      {!matches?.length && (
        <div
          style={{
            padding: 16,
            border: '1px solid #ddd',
            borderRadius: 12,
            background: '#fafafa',
          }}
        >
          No tienes partidos asignados.
        </div>
      )}

      {matches?.map((match: any) => {
        const isSubmitted = match.status === 'submitted'
        const isNextPending = nextPendingId === match.id
        const isBlocked = !isSubmitted && !isNextPending

        const card = (
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
              color: 'black',
              background: isSubmitted
                ? '#f3fff5'
                : isBlocked
                ? '#f4f4f4'
                : '#fffdf2',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              opacity: isBlocked ? 0.75 : 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 18 }}>
                {getMatchTitle(match)}
              </div>

              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 'bold',
                  background: isSubmitted
                    ? '#d9f7df'
                    : isBlocked
                    ? '#e0e0e0'
                    : '#fff2cc',
                  color: '#333',
                }}
              >
                {isSubmitted ? 'CAPTURADO' : isBlocked ? 'BLOQUEADO' : 'PENDIENTE'}
              </div>
            </div>

            <div style={{ marginBottom: 6 }}>{match.sport_name}</div>

            {match.match_time && (
              <div style={{ marginBottom: 6, fontSize: 14, color: '#666' }}>
                Horario: {match.match_time}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: 10,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <TeamMini name={match.team_a_name} logo={match.team_a_logo_url} />
              <strong style={{ textAlign: 'center' }}>
                {match.score_a ?? '-'} - {match.score_b ?? '-'}
              </strong>
              <div style={{ justifySelf: 'end' }}>
                <TeamMini name={match.team_b_name} logo={match.team_b_logo_url} />
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#666' }}>
              {isBlocked
                ? 'Primero debes capturar la jornada anterior'
                : 'Toca para ver detalle'}
            </div>
          </div>
        )

        if (isBlocked) {
          return <div key={match.id}>{card}</div>
        }

        return (
          <Link
            key={match.id}
            href={`/referee/${match.id}`}
            style={{ textDecoration: 'none' }}
          >
            {card}
          </Link>
        )
      })}
    </main>
  )
}