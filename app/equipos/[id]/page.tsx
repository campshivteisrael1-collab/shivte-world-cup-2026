'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const secs = safe % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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
  const [scoreA, setScoreA] = useState(match.live_score_a ?? 0)
  const [scoreB, setScoreB] = useState(match.live_score_b ?? 0)
  const [status, setStatus] = useState(match.status)
  const [startedAt, setStartedAt] = useState(match.started_at)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/match-public?id=${match.id}`)
      const data = await res.json()

      setScoreA(data.live_score_a ?? 0)
      setScoreB(data.live_score_b ?? 0)
      setStatus(data.status)
      setStartedAt(data.started_at)
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

  const remainingSeconds = useMemo(() => {
    if (!startedAt) return 20 * 60
    const startMs = new Date(startedAt).getTime()
    const endMs = startMs + 20 * 60 * 1000
    return Math.ceil((endMs - now) / 1000)
  }, [startedAt, now])

  let bgColor = '#f5f5f5'
  if (status === 'submitted') {
    bgColor = '#d4edda'
  } else if (remainingSeconds <= 0 && startedAt) {
    bgColor = '#ffe5e5'
  }

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
        {match.sport?.display_name || match.sport?.name}
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
          {match.teamA?.name}
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
          {match.teamB?.name}
        </div>
      </div>

      {startedAt && status !== 'submitted' && (
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
            status === 'submitted'
              ? '#d9f7df'
              : startedAt
              ? '#dbeafe'
              : '#fff2cc',
          color:
            status === 'submitted'
              ? '#166534'
              : startedAt
              ? '#1d4ed8'
              : '#92400e',
        }}
      >
        {status === 'submitted' && 'CAPTURADO'}
        {status !== 'submitted' && startedAt && 'EN JUEGO'}
        {!startedAt && 'PENDIENTE'}
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

          {match.sport?.referees_display && (
            <p style={{ margin: '6px 0', lineHeight: 1.4 }}>
              <strong>Árbitros:</strong> {match.sport.referees_display}
            </p>
          )}

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

export default function EquipoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const teamId = Number(resolvedParams.id)

  const [team, setTeam] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      const { data: players } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', teamId)
        .order('player_name')

      const { data: allMatches } = await supabase
        .from('matches')
        .select('*')

      const { data: teams } = await supabase.from('teams').select('*')
      const { data: sports } = await supabase
        .from('Sports')
        .select('id, name, display_name, location, referees_display, rules')

      const { data: restSchedule } = await supabase
        .from('rest_schedule')
        .select('*')

      const jornadasMap: Record<string, any[]> = {}

      allMatches?.forEach((m: any) => {
        const jornada = m.match_code.split('-')[0]

        if (!jornadasMap[jornada]) jornadasMap[jornada] = []
        jornadasMap[jornada].push(m)
      })

      const jornadas = Object.keys(jornadasMap).sort()
      const esJornadaRegular = (jornada: string) => /^J\d+/.test(jornada)

      const finalList = jornadas
        .map((jornada) => {
          const matches = jornadasMap[jornada]

          const equiposJugando = new Set<number>()
          matches.forEach((m: any) => {
            equiposJugando.add(m.team_a_id)
            equiposJugando.add(m.team_b_id)
          })

          if (esJornadaRegular(jornada) && !equiposJugando.has(teamId)) {
            const rest = restSchedule?.find((r: any) => r.jornada === jornada)

            return {
              isRest: true,
              jornada,
              horario: rest?.horario || matches?.[0]?.match_time || null,
            }
          }

          const match = matches.find(
            (m: any) => m.team_a_id === teamId || m.team_b_id === teamId
          )

          if (!match) return null

          const teamA = teams?.find((t: any) => t.id === match.team_a_id)
          const teamB = teams?.find((t: any) => t.id === match.team_b_id)
          const sport = sports?.find((s: any) => s.id === match.sport_id)

          return {
            ...match,
            teamA,
            teamB,
            sport,
          }
        })
        .filter(Boolean)

      setTeam(team)
      setPlayers(players || [])
      setItems(finalList)
      setLoading(false)
    }

    load()
  }, [teamId])

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  if (!team) {
    return <main style={{ padding: 20 }}>Equipo no encontrado</main>
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 760,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <a
        href="/"
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
        ← Inicio
      </a>

      <div>
        <Link
          href="/equipos"
          style={{
            display: 'inline-block',
            marginBottom: 16,
            padding: '8px 12px',
            background: '#eee',
            borderRadius: 10,
            textDecoration: 'none',
            color: 'black',
            fontWeight: 'bold',
          }}
        >
          ← Equipos
        </Link>
      </div>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 18,
          padding: 16,
          background: '#f7f7f7',
          marginBottom: 20,
          boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: 82,
              height: 82,
              borderRadius: 18,
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
                  maxWidth: 62,
                  maxHeight: 62,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : null}
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              lineHeight: 1.1,
              overflowWrap: 'anywhere',
            }}
          >
            {team.name}
          </h1>
        </div>

        <p style={{ margin: '8px 0', lineHeight: 1.45 }}>
          <strong>Director técnico:</strong> {team.coach_name || 'Por asignar'}
        </p>

        <p style={{ margin: '8px 0', lineHeight: 1.5 }}>
          <strong>Jugadores:</strong>{' '}
          {players.length > 0
            ? players.map((p: any) => p.player_name).join(', ')
            : 'Por asignar'}
        </p>
      </div>

      {items.map((item: any, i: number) =>
        item.isRest ? (
          <div
            key={i}
            style={{
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
              background: '#fff3cd',
              border: '1px solid #ddd',
              boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: 17 }}>
              {item.jornada.replace(/^J(\d+)$/, 'Jornada $1')} — DESCANSO
            </div>

            {item.horario && (
              <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
                Horario: {item.horario}
              </div>
            )}

            <div style={{ marginTop: 10, lineHeight: 1.4 }}>
              Este equipo no juega en esta jornada
            </div>
          </div>
        ) : (
          <TeamMatchCard key={item.id} match={item} />
        )
      )}
    </main>
  )
}