import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import LiveMatchControls from './live-match-controls'
import KnockoutMatchControls from './knockout-match-controls'
import FinalMatchControls from './final-match-controls'
import {
  getOfficialDisplayMatch,
  hasFinalScore,
  sortMatches,
} from '../../../lib/knockout'

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

function isSubmitted(match: any) {
  return match?.status === 'submitted' || hasFinalScore(match)
}

function getTeam(teams: any[], id: number | string | null | undefined) {
  if (id === null || id === undefined) return null
  return teams.find((team) => String(team.id) === String(id)) || null
}

function makePlaceholderTeam(name: string) {
  return {
    id: null,
    name,
    team: name,
    coach_name: null,
    logo_url: null,
  }
}

function makeTeamFromView(match: any, side: 'a' | 'b') {
  if (side === 'a') {
    return {
      id: match.team_a_id,
      name: match.team_a_name || 'Equipo A',
      team: match.team_a_name || 'Equipo A',
      coach_name: match.team_a_coach_name || null,
      logo_url: match.team_a_logo_url || null,
    }
  }

  return {
    id: match.team_b_id,
    name: match.team_b_name || 'Equipo B',
    team: match.team_b_name || 'Equipo B',
    coach_name: match.team_b_coach_name || null,
    logo_url: match.team_b_logo_url || null,
  }
}

function getDisplayScoreA(match: any) {
  if (isSubmitted(match)) return match.score_a ?? 0
  if (match.started_at) return match.live_score_a ?? 0
  return match.live_score_a ?? match.score_a ?? 0
}

function getDisplayScoreB(match: any) {
  if (isSubmitted(match)) return match.score_b ?? 0
  if (match.started_at) return match.live_score_b ?? 0
  return match.live_score_b ?? match.score_b ?? 0
}

function getPhaseBlockReason(match: any, allMatches: any[]) {
  if (match.phase === 'quarterfinal') {
    const pendingRegular = allMatches.some(
      (m) => m.phase === 'regular' && !isSubmitted(m)
    )

    if (pendingRegular) {
      return 'Los cuartos se habilitan cuando termine toda la fase regular.'
    }
  }

  if (match.phase === 'semifinal') {
    const pendingQuarterfinals = allMatches.some(
      (m) => m.phase === 'quarterfinal' && !isSubmitted(m)
    )

    if (pendingQuarterfinals) {
      return 'Las semifinales se habilitan cuando terminen todos los cuartos de final.'
    }
  }

  if (match.phase === 'final') {
    const pendingSemifinals = allMatches.some(
      (m) => m.phase === 'semifinal' && !isSubmitted(m)
    )

    if (pendingSemifinals) {
      return 'La final se habilita cuando terminen todas las semifinales.'
    }
  }

  return null
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

  const refereeId = session.referee_id

  if (!refereeId) {
    return (
      <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <h1>Partido</h1>
        <p style={{ color: 'red' }}>
          Sesión inválida: no se encontró referee_id.
        </p>
      </main>
    )
  }

  const { data: refereeMatches } = await supabase
    .from('matches')
    .select('id, status, match_code, phase, match_time, score_a, score_b')
    .eq('referee_id', refereeId)

  const sortedRefereeMatches = (refereeMatches || []).sort(sortMatches)

  const nextPendingId =
    sortedRefereeMatches.find((m: any) => !isSubmitted(m))?.id ?? null

  const { data: match, error: matchError } = await supabase
    .from('matches_view')
    .select('*')
    .eq('id', id)
    .eq('referee_id', refereeId)
    .single()

  if (matchError || !match) return <div>Partido no encontrado</div>

  const { data: allMatchesRaw } = await supabase
    .from('matches_view')
    .select('*')

  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('*')

  const allMatches = allMatchesRaw || []
  const teams = teamsRaw || []

  const displayMatch = getOfficialDisplayMatch(match, allMatches, teams)

  const teamA =
    displayMatch?._team_a_display ||
    getTeam(teams, displayMatch?.team_a_id) ||
    makeTeamFromView(match, 'a') ||
    makePlaceholderTeam('Equipo A')

  const teamB =
    displayMatch?._team_b_display ||
    getTeam(teams, displayMatch?.team_b_id) ||
    makeTeamFromView(match, 'b') ||
    makePlaceholderTeam('Equipo B')

  const submitted = isSubmitted(match)
  const isNextPending = nextPendingId === match.id
  const phaseBlockReason = getPhaseBlockReason(match, allMatches)

  const isBlocked =
    !submitted && (!isNextPending || Boolean(phaseBlockReason))

  const blockText =
    phaseBlockReason ||
    'Primero debes capturar la jornada anterior antes de abrir este partido.'

  const teamAId = teamA?.id
  const teamBId = teamB?.id

  const { data: teamAPlayers } = teamAId
    ? await supabase
        .from('team_players')
        .select('player_name')
        .eq('team_id', teamAId)
        .order('player_name')
    : { data: [] }

  const { data: teamBPlayers } = teamBId
    ? await supabase
        .from('team_players')
        .select('player_name')
        .eq('team_id', teamBId)
        .order('player_name')
    : { data: [] }

  const teamAPlayerNames =
    teamAPlayers && teamAPlayers.length > 0
      ? teamAPlayers.map((p: any) => p.player_name).filter(Boolean)
      : []

  const teamBPlayerNames =
    teamBPlayers && teamBPlayers.length > 0
      ? teamBPlayers.map((p: any) => p.player_name).filter(Boolean)
      : []

  const { data: sport } = await supabase
    .from('Sports')
    .select('name, display_name, location, referees_display, rules')
    .eq('id', match.sport_id)
    .single()

  const { data: sportReferees } = await supabase
    .from('referees')
    .select('name, username, sport_id, is_active')
    .eq('sport_id', match.sport_id)
    .eq('is_active', true)
    .order('name')

  const sportTitle =
    match.sport_display ||
    match.sport_name ||
    sport?.display_name ||
    sport?.name ||
    'Deporte'

  const refereesDisplay =
    sportReferees && sportReferees.length > 0
      ? sportReferees.map((r: any) => r.name || r.username).join(', ')
      : 'Sin asignar'

  const displayScoreA = getDisplayScoreA(match)
  const displayScoreB = getDisplayScoreB(match)

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
            fontWeight: 'bold',
          }}
        >
          {blockText}
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

        <p style={{ margin: '6px 0' }}>
          <strong>Árbitros:</strong> {refereesDisplay}
        </p>

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
        <TeamHeader
          name={teamA?.name || teamA?.team || 'Equipo A'}
          logo={teamA?.logo_url}
        />

        <div style={{ fontWeight: 'bold', fontSize: 24 }}>
          {displayScoreA} - {displayScoreB}
        </div>

        <TeamHeader
          name={teamB?.name || teamB?.team || 'Equipo B'}
          logo={teamB?.logo_url}
        />
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
            Ver equipo {teamA?.name || teamA?.team || 'Equipo A'}
          </summary>

          <div style={{ marginTop: 10 }}>
            <p style={{ margin: '6px 0' }}>
              <strong>Director técnico:</strong> {teamA?.coach_name || 'Por asignar'}
            </p>

            <p style={{ margin: '6px 0' }}>
              <strong>Jugadores:</strong>{' '}
              {teamAPlayerNames.length > 0
                ? teamAPlayerNames.join(', ')
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
            Ver equipo {teamB?.name || teamB?.team || 'Equipo B'}
          </summary>

          <div style={{ marginTop: 10 }}>
            <p style={{ margin: '6px 0' }}>
              <strong>Director técnico:</strong> {teamB?.coach_name || 'Por asignar'}
            </p>

            <p style={{ margin: '6px 0' }}>
              <strong>Jugadores:</strong>{' '}
              {teamBPlayerNames.length > 0
                ? teamBPlayerNames.join(', ')
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
            {teamA?.name || teamA?.team || 'Equipo A'}: {match.score_a}
          </p>

          <p>
            {teamB?.name || teamB?.team || 'Equipo B'}: {match.score_b}
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
            fontWeight: 'bold',
          }}
        >
          Este partido todavía no está habilitado.
        </div>
      ) : match.phase === 'final' ? (
        <FinalMatchControls
          matchId={match.id}
          teamAName={teamA?.name || teamA?.team || 'Equipo A'}
          teamBName={teamB?.name || teamB?.team || 'Equipo B'}
          teamAId={teamA?.id}
          teamBId={teamB?.id}
          teamAPlayers={teamAPlayerNames}
          teamBPlayers={teamBPlayerNames}
          initialLiveScoreA={match.live_score_a}
          initialLiveScoreB={match.live_score_b}
          initialNote={match.referee_note}
          initialStartedAt={match.started_at}
        />
      ) : match.phase === 'quarterfinal' || match.phase === 'semifinal' ? (
        <KnockoutMatchControls
          matchId={match.id}
          teamAName={teamA?.name || teamA?.team || 'Equipo A'}
          teamBName={teamB?.name || teamB?.team || 'Equipo B'}
          teamAId={teamA?.id}
          teamBId={teamB?.id}
          initialLiveScoreA={match.live_score_a}
          initialLiveScoreB={match.live_score_b}
          initialNote={match.referee_note}
          initialStartedAt={match.started_at}
        />
      ) : (
        <LiveMatchControls
          matchId={match.id}
          teamAName={teamA?.name || teamA?.team || 'Equipo A'}
          teamBName={teamB?.name || teamB?.team || 'Equipo B'}
          initialLiveScoreA={match.live_score_a}
          initialLiveScoreB={match.live_score_b}
          initialNote={match.referee_note}
          initialStartedAt={match.started_at}
        />
      )}
    </main>
  )
}