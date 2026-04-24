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

function hasFinalScore(match: any) {
  if (!match) return false

  return (
    match.score_a !== null &&
    match.score_a !== undefined &&
    match.score_b !== null &&
    match.score_b !== undefined
  )
}

function isSubmitted(match: any) {
  return match?.status === 'submitted' || hasFinalScore(match)
}

function getTeamGroup(team: any) {
  return team?.group_name || team?.group || team?.grupo || 'Sin grupo'
}

function getTeam(teams: any[], id: number) {
  return teams.find((team) => String(team.id) === String(id)) || null
}

function parseTimeRangeToMinutes(value: string | null | undefined) {
  if (!value) return 999999

  const firstPart = value.split('-')[0]?.trim().toLowerCase() || ''
  const match = firstPart.match(/(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)/)

  if (!match) return 999999

  let hour = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3]

  if (meridiem === 'p.m.' && hour !== 12) hour += 12
  if (meridiem === 'a.m.' && hour === 12) hour = 0

  return hour * 60 + minutes
}

function getPhaseOrder(phase: string) {
  if (phase === 'regular') return 1
  if (phase === 'quarterfinal') return 2
  if (phase === 'semifinal') return 3
  if (phase === 'final') return 4
  return 99
}

function sortMatches(a: any, b: any) {
  const phaseA = getPhaseOrder(a.phase)
  const phaseB = getPhaseOrder(b.phase)

  if (phaseA !== phaseB) return phaseA - phaseB

  const codeA = String(a.match_code || '')
  const codeB = String(b.match_code || '')

  if (codeA !== codeB) {
    return codeA.localeCompare(codeB, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }

  return parseTimeRangeToMinutes(a.match_time) - parseTimeRangeToMinutes(b.match_time)
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

function calculateGeneralStandings(matches: any[], teams: any[]) {
  const table: any = {}

  teams.forEach((team) => {
    table[team.id] = {
      id: team.id,
      team: team.name,
      name: team.name,
      coach_name: team.coach_name,
      logo_url: team.logo_url,
      group: getTeamGroup(team),
      PJ: 0,
      PG: 0,
      PE: 0,
      PP: 0,
      PF: 0,
      PC: 0,
      DIF: 0,
      PTS: 0,
    }
  })

  matches
    .filter((match) => match.phase === 'regular' && hasFinalScore(match))
    .forEach((match) => {
      const teamA = table[match.team_a_id]
      const teamB = table[match.team_b_id]

      if (!teamA || !teamB) return

      const scoreA = Number(match.score_a ?? 0)
      const scoreB = Number(match.score_b ?? 0)

      teamA.PJ++
      teamB.PJ++

      teamA.PF += scoreA
      teamA.PC += scoreB

      teamB.PF += scoreB
      teamB.PC += scoreA

      if (scoreA > scoreB) {
        teamA.PG++
        teamA.PTS += 3
        teamB.PP++
      } else if (scoreB > scoreA) {
        teamB.PG++
        teamB.PTS += 3
        teamA.PP++
      } else {
        teamA.PE++
        teamB.PE++
        teamA.PTS++
        teamB.PTS++
      }
    })

  Object.values(table).forEach((team: any) => {
    team.DIF = team.PF - team.PC
  })

  return Object.values(table).sort((a: any, b: any) => {
    if (b.PTS !== a.PTS) return b.PTS - a.PTS
    if (b.DIF !== a.DIF) return b.DIF - a.DIF
    if (b.PF !== a.PF) return b.PF - a.PF
    return a.team.localeCompare(b.team)
  })
}

function getWinnerTeam(match: any) {
  if (!match) return null
  if (!hasFinalScore(match)) return null

  const scoreA = Number(match.score_a ?? 0)
  const scoreB = Number(match.score_b ?? 0)

  if (scoreA > scoreB) return match._team_a_display || null
  if (scoreB > scoreA) return match._team_b_display || null

  return null
}

function buildDynamicKnockoutMatches(allMatches: any[], teams: any[]) {
  const standings = calculateGeneralStandings(allMatches, teams)
  const top8 = standings.slice(0, 8)

  const quarterMatches = allMatches
    .filter((match) => match.phase === 'quarterfinal')
    .sort(sortMatches)

  const semiMatches = allMatches
    .filter((match) => match.phase === 'semifinal')
    .sort(sortMatches)

  const finalMatches = allMatches
    .filter((match) => match.phase === 'final')
    .sort(sortMatches)

  const quarterPairs = [
    [0, 7],
    [1, 6],
    [2, 5],
    [3, 4],
  ]

  const quarterDisplayMatches = quarterMatches.map((match, index) => {
    const pair = quarterPairs[index] || [null, null]
    const teamA = pair[0] !== null ? top8[pair[0]] : null
    const teamB = pair[1] !== null ? top8[pair[1]] : null

    return {
      ...match,
      _team_a_display:
        teamA || makePlaceholderTeam(pair[0] !== null ? `${pair[0] + 1}° lugar` : 'Clasificado'),
      _team_b_display:
        teamB || makePlaceholderTeam(pair[1] !== null ? `${pair[1] + 1}° lugar` : 'Clasificado'),
    }
  })

  const qf1Winner = getWinnerTeam(quarterDisplayMatches[0])
  const qf2Winner = getWinnerTeam(quarterDisplayMatches[1])
  const qf3Winner = getWinnerTeam(quarterDisplayMatches[2])
  const qf4Winner = getWinnerTeam(quarterDisplayMatches[3])

  const semiDisplayMatches = semiMatches.map((match, index) => {
    if (index === 0) {
      return {
        ...match,
        _team_a_display: qf1Winner || makePlaceholderTeam('Ganador QF1'),
        _team_b_display: qf2Winner || makePlaceholderTeam('Ganador QF2'),
      }
    }

    if (index === 1) {
      return {
        ...match,
        _team_a_display: qf3Winner || makePlaceholderTeam('Ganador QF3'),
        _team_b_display: qf4Winner || makePlaceholderTeam('Ganador QF4'),
      }
    }

    return {
      ...match,
      _team_a_display: makePlaceholderTeam('Ganador cuarto'),
      _team_b_display: makePlaceholderTeam('Ganador cuarto'),
    }
  })

  const sf1Winner = getWinnerTeam(semiDisplayMatches[0])
  const sf2Winner = getWinnerTeam(semiDisplayMatches[1])

  const finalDisplayMatches = finalMatches.map((match) => ({
    ...match,
    _team_a_display: sf1Winner || makePlaceholderTeam('Ganador SF1'),
    _team_b_display: sf2Winner || makePlaceholderTeam('Ganador SF2'),
  }))

  return [...quarterDisplayMatches, ...semiDisplayMatches, ...finalDisplayMatches]
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
    .order('match_code', { ascending: true })

  const sortedRefereeMatches = (refereeMatches || []).sort(sortMatches)

  const nextPendingId =
    sortedRefereeMatches.find((m: any) => !isSubmitted(m))?.id ?? null

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
    .eq('referee_id', refereeId)
    .single()

  if (matchError || !match) return <div>Partido no encontrado</div>

  const { data: allMatchesRaw } = await supabase
    .from('matches')
    .select('*')

  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('id, name, coach_name, logo_url, group_name, group, grupo')

  const allMatches = allMatchesRaw || []
  const teams = teamsRaw || []

  const dynamicKnockoutMatches = buildDynamicKnockoutMatches(allMatches, teams)
  const dynamicMatch =
    dynamicKnockoutMatches.find((m: any) => String(m.id) === String(match.id)) || null

  const displayMatch = dynamicMatch || match

  const teamA =
    displayMatch._team_a_display ||
    getTeam(teams, displayMatch.team_a_id) ||
    makePlaceholderTeam('Equipo A')

  const teamB =
    displayMatch._team_b_display ||
    getTeam(teams, displayMatch.team_b_id) ||
    makePlaceholderTeam('Equipo B')

  const submitted = match.status === 'submitted'
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

  const sportTitle = sport?.display_name || sport?.name || 'Deporte'

  const refereesDisplay =
    sportReferees && sportReferees.length > 0
      ? sportReferees.map((r: any) => r.name || r.username).join(', ')
      : 'Sin asignar'

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
        <TeamHeader name={teamA?.name || teamA?.team || 'Equipo A'} logo={teamA?.logo_url} />

        <div style={{ fontWeight: 'bold', fontSize: 24 }}>
          {match.live_score_a ?? 0} - {match.live_score_b ?? 0}
        </div>

        <TeamHeader name={teamB?.name || teamB?.team || 'Equipo B'} logo={teamB?.logo_url} />
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
            Ver equipo {teamB?.name || teamB?.team || 'Equipo B'}
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