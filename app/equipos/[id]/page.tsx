'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const secs = safe % 60
  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`
}

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

function isPhaseComplete(allMatches: any[], phase: string) {
  const phaseMatches = allMatches.filter((match) => match.phase === phase)

  if (phaseMatches.length === 0) return false

  return phaseMatches.every((match) => isSubmitted(match))
}

function buildDynamicKnockoutMatches(allMatches: any[], teams: any[]) {
  const regularComplete = isPhaseComplete(allMatches, 'regular')
  const quarterComplete = isPhaseComplete(allMatches, 'quarterfinal')
  const semifinalComplete = isPhaseComplete(allMatches, 'semifinal')

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

  const quarterDisplayMatches = regularComplete
    ? quarterMatches.map((match, index) => {
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
    : []

  const qf1Winner = getWinnerTeam(quarterDisplayMatches[0])
  const qf2Winner = getWinnerTeam(quarterDisplayMatches[1])
  const qf3Winner = getWinnerTeam(quarterDisplayMatches[2])
  const qf4Winner = getWinnerTeam(quarterDisplayMatches[3])

  const semiDisplayMatches = quarterComplete
    ? semiMatches.map((match, index) => {
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
    : []

  const sf1Winner = getWinnerTeam(semiDisplayMatches[0])
  const sf2Winner = getWinnerTeam(semiDisplayMatches[1])

  const finalDisplayMatches = semifinalComplete
    ? finalMatches.map((match) => ({
        ...match,
        _team_a_display: sf1Winner || makePlaceholderTeam('Ganador SF1'),
        _team_b_display: sf2Winner || makePlaceholderTeam('Ganador SF2'),
      }))
    : []

  return [...quarterDisplayMatches, ...semiDisplayMatches, ...finalDisplayMatches]
}

function doesTeamPlayMatch(match: any, teamId: string) {
  const teamAId = match._team_a_display?.id ?? match.team_a_id
  const teamBId = match._team_b_display?.id ?? match.team_b_id

  return String(teamAId) === String(teamId) || String(teamBId) === String(teamId)
}

function TeamMatchCard({ match }: { match: any }) {
  const [now, setNow] = useState(Date.now())
  const [liveScoreA, setLiveScoreA] = useState(match.live_score_a ?? 0)
  const [liveScoreB, setLiveScoreB] = useState(match.live_score_b ?? 0)
  const [finalScoreA, setFinalScoreA] = useState(match.score_a)
  const [finalScoreB, setFinalScoreB] = useState(match.score_b)
  const [status, setStatus] = useState(match.status)
  const [startedAt, setStartedAt] = useState(match.started_at)
  const [open, setOpen] = useState(false)

  const sportDurationMinutes = Number(
    match.sport?.duration || match.sport?.duration_minutes || 20
  )

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/match-public?id=${match.id}`, {
          cache: 'no-store',
        })

        if (!res.ok) return

        const data = await res.json()

        setLiveScoreA(data.live_score_a ?? 0)
        setLiveScoreB(data.live_score_b ?? 0)
        setFinalScoreA(data.score_a)
        setFinalScoreB(data.score_b)
        setStatus(data.status)
        setStartedAt(data.started_at)
      } catch {
        // Evita romper la vista si falla el polling.
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [match.id])

  useEffect(() => {
    if (!startedAt || status === 'submitted') return

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt, status])

  const isFinalSubmitted = status === 'submitted'

  const hasVisibleFinalScore =
    finalScoreA !== null &&
    finalScoreA !== undefined &&
    finalScoreB !== null &&
    finalScoreB !== undefined

  const scoreA = isFinalSubmitted
    ? finalScoreA ?? liveScoreA ?? 0
    : hasVisibleFinalScore
      ? finalScoreA
      : startedAt
        ? liveScoreA
        : 0

  const scoreB = isFinalSubmitted
    ? finalScoreB ?? liveScoreB ?? 0
    : hasVisibleFinalScore
      ? finalScoreB
      : startedAt
        ? liveScoreB
        : 0

  const remainingSeconds = useMemo(() => {
    if (!startedAt) return sportDurationMinutes * 60

    const startMs = new Date(startedAt).getTime()
    const endMs = startMs + sportDurationMinutes * 60 * 1000

    return Math.ceil((endMs - now) / 1000)
  }, [startedAt, now, sportDurationMinutes])

  let bgColor = '#f5f5f5'
  if (isFinalSubmitted || hasVisibleFinalScore) bgColor = '#d4edda'
  else if (remainingSeconds <= 0 && startedAt) bgColor = '#ffe5e5'

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        background: bgColor,
        border: '1px solid #ddd',
        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          fontWeight: 'bold',
          fontSize: 17,
          marginBottom: 6,
          lineHeight: 1.25,
        }}
      >
        {getMatchTitle(match)}
      </div>

      <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
        {match.sport?.display_name || match.sport?.name || 'Deporte'}
      </div>

      {match.match_time && (
        <div style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>
          {match.match_time}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 8,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: 16,
            overflowWrap: 'anywhere',
          }}
        >
          {match.teamA?.name || match.teamA?.team || 'Equipo'}
        </div>

        <div
          style={{
            fontSize: 30,
            fontWeight: 'bold',
            textAlign: 'center',
            minWidth: 88,
          }}
        >
          {scoreA} - {scoreB}
        </div>

        <div
          style={{
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: 16,
            overflowWrap: 'anywhere',
          }}
        >
          {match.teamB?.name || match.teamB?.team || 'Equipo'}
        </div>
      </div>

      {startedAt && !isFinalSubmitted && !hasVisibleFinalScore && (
        <div
          style={{
            marginTop: 8,
            marginBottom: 12,
            padding: 12,
            borderRadius: 14,
            background: '#fff',
            border: '1px solid #ececec',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 12, color: '#666' }}>Tiempo restante</div>
          <div style={{ fontSize: 30, fontWeight: 'bold', lineHeight: 1.1 }}>
            {formatTime(remainingSeconds)}
          </div>

          {remainingSeconds <= 0 && (
            <div style={{ color: 'red', fontWeight: 'bold', marginTop: 4 }}>
              Tiempo terminado
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          fontWeight: 'bold',
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: 999,
          background:
            isFinalSubmitted || hasVisibleFinalScore
              ? '#d9f7df'
              : startedAt
                ? '#dbeafe'
                : '#fff2cc',
          color:
            isFinalSubmitted || hasVisibleFinalScore
              ? '#166534'
              : startedAt
                ? '#1d4ed8'
                : '#92400e',
        }}
      >
        {(isFinalSubmitted || hasVisibleFinalScore) && 'FINALIZADO'}
        {!isFinalSubmitted && !hasVisibleFinalScore && startedAt && 'EN JUEGO'}
        {!isFinalSubmitted && !hasVisibleFinalScore && !startedAt && 'POR JUGAR'}
      </div>

      <div style={{ marginTop: 14 }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#111',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 15,
          }}
        >
          {open ? 'Ocultar detalles' : 'Ver detalles'}
        </button>
      </div>

      {open && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            background: '#fafafa',
            border: '1px solid #ddd',
          }}
        >
          <h4 style={{ marginTop: 0, marginBottom: 10 }}>
            {match.sport?.display_name || match.sport?.name || 'Deporte'}
          </h4>

          {match.sport?.location && (
            <p style={{ margin: '6px 0', lineHeight: 1.4 }}>
              <strong>Ubicación:</strong> {match.sport.location}
            </p>
          )}

          <p style={{ margin: '6px 0', lineHeight: 1.4 }}>
            <strong>Árbitros:</strong>{' '}
            {match.referees_display || 'Sin asignar'}
          </p>

          {match.sport?.rules && (
            <p style={{ margin: '6px 0', lineHeight: 1.45 }}>
              <strong>Reglas:</strong> {match.sport.rules}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function EquipoDetallePage() {
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError('')

        const teamsRes = await fetch('/api/admin/teams-list', {
          cache: 'no-store',
        })
        const teamsJson = await teamsRes.json()

        if (!teamsRes.ok) {
          setError(teamsJson.error || 'No se pudo cargar el equipo')
          setLoading(false)
          return
        }

        const allTeams = teamsJson.teams || []

        const currentTeam = allTeams.find(
          (t: any) => String(t.id) === String(id)
        )

        if (!currentTeam) {
          setError('Equipo no encontrado')
          setLoading(false)
          return
        }

        const { data: allMatchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')

        if (matchesError) {
          setError(matchesError.message || 'No se pudieron cargar los partidos')
          setLoading(false)
          return
        }

        const { data: sportsData, error: sportsError } = await supabase
          .from('Sports')
          .select('*')

        if (sportsError) {
          setError(sportsError.message || 'No se pudieron cargar los deportes')
          setLoading(false)
          return
        }

        const refereesRes = await fetch('/api/admin/referees-list', {
          cache: 'no-store',
        })
        const refereesJson = await refereesRes.json()

        if (!refereesRes.ok) {
          setError(refereesJson?.error || 'No se pudieron cargar los árbitros')
          setLoading(false)
          return
        }

        const refereesData = (refereesJson.referees || []).filter(
          (referee: any) => referee.is_active !== false
        )

        const teamsMap = new Map(
          allTeams.map((t: any) => [String(t.id), t])
        )

        const sportsMap = new Map(
          (sportsData || []).map((s: any) => [Number(s.id), s])
        )

        const refereesBySport = new Map<number, any[]>()

        ;(refereesData || []).forEach((referee: any) => {
          if (referee.sport_id === null || referee.sport_id === undefined) return

          const key = Number(referee.sport_id)
          const current = refereesBySport.get(key) || []

          current.push(referee)
          refereesBySport.set(key, current)
        })

        const allRawMatches = allMatchesData || []

        const dynamicKnockoutMatches = buildDynamicKnockoutMatches(
          allRawMatches,
          allTeams
        )

        const regularMatchesForTeam = allRawMatches.filter((match: any) => {
          if (match.phase !== 'regular') return false

          return (
            String(match.team_a_id) === String(id) ||
            String(match.team_b_id) === String(id)
          )
        })

        const knockoutMatchesForTeam = dynamicKnockoutMatches.filter(
          (match: any) => doesTeamPlayMatch(match, id)
        )

        const combinedMatches = [
          ...regularMatchesForTeam,
          ...knockoutMatchesForTeam,
        ].filter((match: any, index: number, arr: any[]) => {
          return arr.findIndex((m: any) => String(m.id) === String(match.id)) === index
        })

        const enrichedMatches = combinedMatches.sort(sortMatches).map((match: any) => {
          const sportId = Number(match.sport_id)
          const sportReferees = refereesBySport.get(sportId) || []

          const teamA =
            match._team_a_display ||
            teamsMap.get(String(match.team_a_id)) ||
            null

          const teamB =
            match._team_b_display ||
            teamsMap.get(String(match.team_b_id)) ||
            null

          return {
            ...match,
            teamA,
            teamB,
            sport: sportsMap.get(sportId) || null,
            referees_display:
              sportReferees.length > 0
                ? sportReferees.map((r: any) => r.name || r.username).join(', ')
                : 'Sin asignar',
          }
        })

        setTeam(currentTeam)
        setMatches(enrichedMatches)
        setLoading(false)
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar el equipo')
        setLoading(false)
      }
    }

    if (id) load()
  }, [id])

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  if (error || !team) {
    return (
      <main style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
        <a
          href="/equipos"
          style={{
            display: 'inline-block',
            marginBottom: 12,
            padding: '8px 14px',
            background: '#111827',
            color: 'white',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: 14,
          }}
        >
          ← Equipos
        </a>

        <div
          style={{
            padding: 14,
            borderRadius: 12,
            background: '#fee2e2',
            color: '#991b1b',
            fontWeight: 'bold',
          }}
        >
          {error || 'No se encontró el equipo'}
        </div>
      </main>
    )
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 900,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '8px 14px',
            background: '#111827',
            color: 'white',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: 14,
          }}
        >
          ← Inicio
        </a>

        <a
          href="/equipos"
          style={{
            display: 'inline-block',
            padding: '8px 14px',
            background: '#111827',
            color: 'white',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: 14,
          }}
        >
          ← Equipos
        </a>
      </div>

      <div
        style={{
          borderRadius: 22,
          background: '#f7f7f7',
          border: '1px solid #ddd',
          padding: 18,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: '#fff',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt={team.name}
                style={{
                  maxWidth: 56,
                  maxHeight: 56,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : null}
          </div>

          <div>
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>
              {team.name}
            </h1>
          </div>
        </div>

        <p style={{ margin: '8px 0', lineHeight: 1.45 }}>
          <strong>Director técnico:</strong>{' '}
          {team.coach_name || 'Por asignar'}
        </p>

        <p style={{ margin: '8px 0', lineHeight: 1.5 }}>
          <strong>Jugadores:</strong>{' '}
          {Array.isArray(team.players) && team.players.length > 0
            ? team.players.join(', ')
            : 'Por asignar'}
        </p>
      </div>

      <h2 style={{ marginTop: 0, marginBottom: 14 }}>Partidos</h2>

      {matches.length === 0 ? (
        <div
          style={{
            borderRadius: 18,
            padding: 16,
            background: '#f7f7f7',
            border: '1px solid #ddd',
          }}
        >
          No hay partidos registrados para este equipo.
        </div>
      ) : (
        matches.map((match) => (
          <TeamMatchCard
            key={match.id}
            match={match}
          />
        ))
      )}
    </main>
  )
}