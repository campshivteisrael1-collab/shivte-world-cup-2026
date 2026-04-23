import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import LiveMatchControls from './live-match-controls'

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

function TeamHeader({
  name,
  logo,
}: {
  name: string
  logo?: string | null
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
      }}
    >
      {logo ? (
        <img
          src={logo}
          alt={name}
          style={{
            width: 30,
            height: 30,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : null}
      <span>{name}</span>
    </div>
  )
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) return <div>No autorizado</div>

  const { data: session } = await supabase
    .from('referee_sessions')
    .select('*')
    .eq('token', token)
    .single()

  if (!session) return <div>Sesión inválida</div>

  const { data: refereeMatches } = await supabase
    .from('matches')
    .select('id, status, match_code')
    .eq('referee_id', session.profile_id)
    .order('match_code', { ascending: true })

  const nextPendingId =
    refereeMatches?.find((m: any) => m.status !== 'submitted')?.id ?? null

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select(`
      id,
      match_code,
      phase,
      sport_id,
      team_a_id,
      team_b_id,
      referee_id,
      score_a,
      score_b,
      live_score_a,
      live_score_b,
      status,
      referee_note,
      match_time,
      started_at,
      ended_at
    `)
    .eq('id', id)
    .eq('referee_id', session.profile_id)
    .single()

  if (matchError || !match) return <div>Partido no encontrado</div>

  const isSubmitted = match.status === 'submitted'
  const isNextPending = nextPendingId === match.id
  const isBlocked = !isSubmitted && !isNextPending

  const { data: teamA } = await supabase
    .from('teams')
    .select('id, name, coach_name, logo_url')
    .eq('id', match.team_a_id)
    .single()

  const { data: teamB } = await supabase
    .from('teams')
    .select('id, name, coach_name, logo_url')
    .eq('id', match.team_b_id)
    .single()

  const { data: teamAPlayers } = await supabase
    .from('team_players')
    .select('player_name')
    .eq('team_id', match.team_a_id)
    .order('player_name')

  const { data: teamBPlayers } = await supabase
    .from('team_players')
    .select('player_name')
    .eq('team_id', match.team_b_id)
    .order('player_name')

  const { data: sport } = await supabase
    .from('Sports')
    .select('name, display_name, location, referees_display, rules')
    .eq('id', match.sport_id)
    .single()

  const sportTitle = sport?.display_name || sport?.name || 'Deporte'

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <Link
        href="/referee"
        style={{
          display: 'inline-block',
          marginBottom: 16,
          padding: '8px 12px',
          background: '#eee',
          borderRadius: 6,
          textDecoration: 'none',
          color: 'black',
        }}
      >
        ← Mis partidos
      </Link>

      {isBlocked && (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            borderRadius: 10,
            background: '#fff3cd',
            border: '1px solid #e5d28a',
          }}
        >
          Primero debes capturar la jornada anterior antes de abrir este partido.
        </div>
      )}

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 12,
          padding: 16,
          background: '#f7f7f7',
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>{sportTitle}</h2>

        {sport?.location && (
          <p style={{ margin: '6px 0' }}>
            <strong>Ubicación:</strong> {sport.location}
          </p>
        )}

        {sport?.referees_display && (
          <p style={{ margin: '6px 0' }}>
            <strong>Árbitros:</strong> {sport.referees_display}
          </p>
        )}

        {sport?.rules && (
          <p style={{ margin: '6px 0' }}>
            <strong>Reglas:</strong> {sport.rules}
          </p>
        )}
      </div>

      <h1>{getMatchTitle(match)}</h1>
      <p>{sportTitle}</p>

      {match.match_time && (
        <p style={{ color: '#666' }}>Horario: {match.match_time}</p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 12,
          alignItems: 'center',
          marginBottom: 16,
          padding: 14,
          border: '1px solid #ddd',
          borderRadius: 12,
          background: '#fff',
        }}
      >
        <TeamHeader name={teamA?.name || 'Equipo A'} logo={teamA?.logo_url} />
        <div style={{ fontWeight: 'bold', fontSize: 24 }}>
          {match.live_score_a ?? 0} - {match.live_score_b ?? 0}
        </div>
        <TeamHeader name={teamB?.name || 'Equipo B'} logo={teamB?.logo_url} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <details
          style={{
            border: '1px solid #ddd',
            borderRadius: 10,
            padding: 12,
            background: '#fafafa',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
            Ver equipo {teamA?.name}
          </summary>

          <div style={{ marginTop: 10 }}>
            <p style={{ margin: '6px 0' }}>
              <strong>Director técnico:</strong> {teamA?.coach_name || 'Por asignar'}
            </p>

            <p style={{ margin: '6px 0' }}>
              <strong>Jugadores:</strong>{' '}
              {teamAPlayers && teamAPlayers.length > 0
                ? teamAPlayers.map((p: any) => p.player_name).join(', ')
                : 'Por asignar'}
            </p>
          </div>
        </details>

        <details
          style={{
            border: '1px solid #ddd',
            borderRadius: 10,
            padding: 12,
            background: '#fafafa',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
            Ver equipo {teamB?.name}
          </summary>

          <div style={{ marginTop: 10 }}>
            <p style={{ margin: '6px 0' }}>
              <strong>Director técnico:</strong> {teamB?.coach_name || 'Por asignar'}
            </p>

            <p style={{ margin: '6px 0' }}>
              <strong>Jugadores:</strong>{' '}
              {teamBPlayers && teamBPlayers.length > 0
                ? teamBPlayers.map((p: any) => p.player_name).join(', ')
                : 'Por asignar'}
            </p>
          </div>
        </details>
      </div>

      <p>Status: {match.status}</p>

      {match.status === 'submitted' ? (
        <div style={{ marginTop: 20 }}>
          <h3>Resultado final</h3>
          <p>
            {teamA?.name}: {match.score_a}
          </p>
          <p>
            {teamB?.name}: {match.score_b}
          </p>

          {match.referee_note && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: '#f7f7f7',
                borderRadius: 8,
                border: '1px solid #ddd',
              }}
            >
              <strong>Nota del árbitro:</strong>
              <p style={{ marginTop: 8 }}>{match.referee_note}</p>
            </div>
          )}

          <p style={{ color: 'red', marginTop: 10 }}>
            Este partido ya fue capturado y no puede editarse
          </p>
        </div>
      ) : isBlocked ? (
        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 10,
            background: '#f4f4f4',
            border: '1px solid #ddd',
          }}
        >
          Este partido todavía no está habilitado.
        </div>
      ) : (
        <LiveMatchControls
          matchId={match.id}
          teamAName={teamA?.name || 'Equipo A'}
          teamBName={teamB?.name || 'Equipo B'}
          initialLiveScoreA={match.live_score_a}
          initialLiveScoreB={match.live_score_b}
          initialNote={match.referee_note}
          initialStartedAt={match.started_at}
        />
      )}
    </main>
  )
}