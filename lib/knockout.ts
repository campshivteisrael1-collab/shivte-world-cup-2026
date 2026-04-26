export type MatchRow = any
export type TeamRow = any

export function hasFinalScore(match: MatchRow | null | undefined) {
  if (!match) return false

  return (
    match.score_a !== null &&
    match.score_a !== undefined &&
    match.score_b !== null &&
    match.score_b !== undefined
  )
}

export function getTeamGroup(team: TeamRow) {
  return team?.group_name || team?.group || team?.grupo || 'Sin grupo'
}

export function parseTimeRangeToMinutes(value: string | null | undefined) {
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

export function makePlaceholderTeam(name: string) {
  return {
    id: null,
    name,
    team: name,
    logo_url: null,
    coach_name: null,
  }
}

export function calculateGeneralStandings(matches: MatchRow[], teams: TeamRow[]) {
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

export function getWinnerTeam(match: MatchRow | null | undefined) {
  if (!match) return null
  if (!hasFinalScore(match)) return null

  const scoreA = Number(match.score_a ?? 0)
  const scoreB = Number(match.score_b ?? 0)

  if (scoreA > scoreB) return match._team_a_display || null
  if (scoreB > scoreA) return match._team_b_display || null

  return null
}

export function getPhaseOrder(phase: string) {
  if (phase === 'regular') return 1
  if (phase === 'quarterfinal') return 2
  if (phase === 'semifinal') return 3
  if (phase === 'final') return 4
  return 99
}

export function sortMatches(a: MatchRow, b: MatchRow) {
  const phaseA = getPhaseOrder(a.phase)
  const phaseB = getPhaseOrder(b.phase)

  if (phaseA !== phaseB) return phaseA - phaseB

  const timeA = parseTimeRangeToMinutes(a.match_time)
  const timeB = parseTimeRangeToMinutes(b.match_time)

  if (timeA !== timeB) return timeA - timeB

  return String(a.match_code || '').localeCompare(String(b.match_code || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export function buildOfficialKnockoutMatches(matches: MatchRow[], teams: TeamRow[]) {
  const generalStandings = calculateGeneralStandings(matches, teams)
  const top8 = generalStandings.slice(0, 8)

  const quarterMatches = matches
    .filter((match) => match.phase === 'quarterfinal')
    .sort((a, b) => parseTimeRangeToMinutes(a.match_time) - parseTimeRangeToMinutes(b.match_time))

  const semiMatches = matches
    .filter((match) => match.phase === 'semifinal')
    .sort((a, b) => parseTimeRangeToMinutes(a.match_time) - parseTimeRangeToMinutes(b.match_time))

  const finalMatches = matches
    .filter((match) => match.phase === 'final')
    .sort((a, b) => parseTimeRangeToMinutes(a.match_time) - parseTimeRangeToMinutes(b.match_time))

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

  return {
    generalStandings,
    quarterDisplayMatches,
    semiDisplayMatches,
    finalDisplayMatches,
    knockoutMatches: [
      ...quarterDisplayMatches,
      ...semiDisplayMatches,
      ...finalDisplayMatches,
    ],
  }
}

export function getOfficialDisplayMatch(match: MatchRow, matches: MatchRow[], teams: TeamRow[]) {
  if (!match || match.phase === 'regular') return match

  const { knockoutMatches } = buildOfficialKnockoutMatches(matches, teams)

  return (
    knockoutMatches.find((knockoutMatch: MatchRow) => String(knockoutMatch.id) === String(match.id)) ||
    match
  )
}