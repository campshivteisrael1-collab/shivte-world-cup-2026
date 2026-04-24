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

  const refereeId = session.referee_id

  if (!refereeId) {
    return (
      <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
        <h1>Mis partidos</h1>
        <p style={{ color: 'red' }}>
          Sesión inválida: no se encontró referee_id.
        </p>
        <LogoutButton />
      </main>
    )
  }

  const { data: referee } = await supabase
    .from('referees')
    .select('*')
    .eq('id', refereeId)
    .single()

  const { data: assignedKnockoutRaw } = await supabase
    .from('matches')
    .select('id')
    .eq('referee_id', refereeId)
    .in('phase', ['quarterfinal', 'semifinal', 'final'])

  const assignedKnockoutIds = new Set(
    (assignedKnockoutRaw || []).map((match: any) => String(match.id))
  )

  const { data: allMatchesRaw } = await supabase
    .from('matches_view')
    .select('*')

  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('*')

  const allMatches = allMatchesRaw || []
  const teams = teamsRaw || []

  const dynamicKnockoutMatches = buildDynamicKnockoutMatches(allMatches, teams)

  const assignedDynamicKnockoutMatches = dynamicKnockoutMatches
    .filter((match) => assignedKnockoutIds.has(String(match.id)))
    .sort(sortMatches)

  let matches: any[] = []
  let error: any = null

  if (assignedDynamicKnockoutMatches.length > 0) {
    matches = assignedDynamicKnockoutMatches
  } else {
    const { data: regularMatches, error: regularError } = await supabase
      .from('matches_view')
      .select('*')
      .eq('referee_id', refereeId)
      .eq('phase', 'regular')
      .order('match_code', { ascending: true })

    matches = regularMatches || []
    error = regularError
  }

  matches = matches.sort(sortMatches)

  const nextPendingId =
    matches?.find((match: any) => match.status !== 'submitted')?.id ?? null

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
        const submitted = match.status === 'submitted'
        const isNextPending = nextPendingId === match.id
        const phaseBlockReason = getPhaseBlockReason(match, allMatches)

        const isBlocked =
          !submitted && (!isNextPending || Boolean(phaseBlockReason))

        const blockText =
          phaseBlockReason ||
          'Primero debes capturar la jornada anterior'

        const teamA =
          match._team_a_display ||
          getTeam(teams, match.team_a_id) ||
          makePlaceholderTeam(match.team_a_name || 'Equipo')

        const teamB =
          match._team_b_display ||
          getTeam(teams, match.team_b_id) ||
          makePlaceholderTeam(match.team_b_name || 'Equipo')

        const card = (
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
              color: 'black',
              background: submitted
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
                  background: submitted
                    ? '#d9f7df'
                    : isBlocked
                    ? '#e0e0e0'
                    : '#fff2cc',
                  color: '#333',
                }}
              >
                {submitted ? 'FINALIZADO' : isBlocked ? 'BLOQUEADO' : 'POR JUGAR'}
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
              <TeamMini name={teamA.name || teamA.team || 'Equipo'} logo={teamA.logo_url} />

              <strong style={{ textAlign: 'center' }}>
                {match.score_a ?? '-'} - {match.score_b ?? '-'}
              </strong>

              <div style={{ justifySelf: 'end' }}>
                <TeamMini name={teamB.name || teamB.team || 'Equipo'} logo={teamB.logo_url} />
              </div>
            </div>

            <div style={{ fontSize: 13, color: '#666' }}>
              {isBlocked ? blockText : 'Toca para ver detalle'}
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