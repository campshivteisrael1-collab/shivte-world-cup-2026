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

  const hasFinalScore =
    finalScoreA !== null &&
    finalScoreA !== undefined &&
    finalScoreB !== null &&
    finalScoreB !== undefined

  const scoreA = hasFinalScore ? finalScoreA : startedAt ? liveScoreA : 0
  const scoreB = hasFinalScore ? finalScoreB : startedAt ? liveScoreB : 0

  const remainingSeconds = useMemo(() => {
    if (!startedAt) return sportDurationMinutes * 60

    const startMs = new Date(startedAt).getTime()
    const endMs = startMs + sportDurationMinutes * 60 * 1000

    return Math.ceil((endMs - now) / 1000)
  }, [startedAt, now, sportDurationMinutes])

  let bgColor = '#f5f5f5'
  if (hasFinalScore) bgColor = '#d4edda'
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
          {match.teamA?.name || 'Equipo'}
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
          {match.teamB?.name || 'Equipo'}
        </div>
      </div>

      {startedAt && !hasFinalScore && (
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
          background: hasFinalScore
            ? '#d9f7df'
            : startedAt
              ? '#dbeafe'
              : '#fff2cc',
          color: hasFinalScore
            ? '#166534'
            : startedAt
              ? '#1d4ed8'
              : '#92400e',
        }}
      >
        {hasFinalScore && 'CAPTURADO'}
        {!hasFinalScore && startedAt && 'EN JUEGO'}
        {!hasFinalScore && !startedAt && 'PENDIENTE'}
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

        const currentTeam = (teamsJson.teams || []).find(
          (t: any) => String(t.id) === String(id)
        )

        if (!currentTeam) {
          setError('Equipo no encontrado')
          setLoading(false)
          return
        }

        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .or(`team_a_id.eq.${id},team_b_id.eq.${id}`)
          .order('match_code')

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
          (teamsJson.teams || []).map((t: any) => [String(t.id), t])
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

        const enrichedMatches = (matchesData || []).map((match: any) => {
          const sportId = Number(match.sport_id)
          const sportReferees = refereesBySport.get(sportId) || []

          return {
            ...match,
            teamA: teamsMap.get(String(match.team_a_id)) || null,
            teamB: teamsMap.get(String(match.team_b_id)) || null,
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
        matches.map((match) => <TeamMatchCard key={match.id} match={match} />)
      )}
    </main>
  )
}
