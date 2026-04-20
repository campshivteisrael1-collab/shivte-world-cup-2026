'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getTeam(teams: any[], id: number) {
  return teams.find((t) => t.id === id) || null
}

function getTeamName(teams: any[], id: number) {
  return getTeam(teams, id)?.name || 'Equipo'
}

function getJornadaNumber(match: any) {
  if (match.phase !== 'regular') return null
  const raw = match.match_code?.split('-')[0] || ''
  const clean = raw.replace('J', '')
  const num = Number(clean)
  return Number.isNaN(num) ? null : num
}

function getJornadaLabel(match: any) {
  if (match.phase === 'regular') {
    const jornada = getJornadaNumber(match)
    return jornada ? `Jornada ${jornada}` : 'Jornada'
  }
  if (match.phase === 'quarterfinal') return 'Cuartos'
  if (match.phase === 'semifinal') return 'Semifinal'
  if (match.phase === 'final') return 'Final'
  return 'Partido'
}

function getStatusLabel(match: any) {
  if (match.status === 'submitted') return 'FINALIZADO'
  if (match.started_at) return 'EN JUEGO'
  return 'PENDIENTE'
}

function getStatusStyles(match: any) {
  if (match.status === 'submitted') {
    return { background: '#d1fae5', color: '#065f46' }
  }
  if (match.started_at) {
    return { background: '#dbeafe', color: '#1d4ed8' }
  }
  return { background: '#fef3c7', color: '#92400e' }
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

function getDisplayScores(match: any) {
  if (match.status === 'submitted') {
    return {
      a: match.score_a ?? '-',
      b: match.score_b ?? '-',
    }
  }

  if (match.started_at) {
    return {
      a: match.live_score_a ?? 0,
      b: match.live_score_b ?? 0,
    }
  }

  return {
    a: '-',
    b: '-',
  }
}

function getTeamGroup(team: any) {
  return team?.group_name || team?.group || team?.grupo || 'Sin grupo'
}

function TeamRow({
  team,
  align = 'left',
}: {
  team: any
  align?: 'left' | 'center' | 'right'
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent:
          align === 'center'
            ? 'center'
            : align === 'right'
            ? 'flex-end'
            : 'flex-start',
      }}
    >
      {team?.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.name}
          style={{
            width: 26,
            height: 26,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : null}

      <span
        style={{
          fontWeight: 700,
          lineHeight: 1.15,
          overflowWrap: 'anywhere',
        }}
      >
        {team?.name || 'Equipo'}
      </span>
    </div>
  )
}

function MatchCard({
  match,
  teams,
  sportName,
}: {
  match: any
  teams: any[]
  sportName: string
}) {
  const teamA = getTeam(teams, match.team_a_id)
  const teamB = getTeam(teams, match.team_b_id)
  const score = getDisplayScores(match)
  const statusStyle = getStatusStyles(match)

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 18,
        padding: 16,
        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          alignItems: 'center',
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 700 }}>
          {getJornadaLabel(match)}
        </div>

        <div
          style={{
            ...statusStyle,
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {getStatusLabel(match)}
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
        {sportName}
      </div>

      {match.match_time && (
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          {match.match_time}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <div>
          <TeamRow team={teamA} />
        </div>

        <div
          style={{
            fontWeight: 800,
            fontSize: 28,
            textAlign: 'center',
            minWidth: 86,
          }}
        >
          {score.a} - {score.b}
        </div>

        <div>
          <TeamRow team={teamB} align="right" />
        </div>
      </div>
    </div>
  )
}

function StandingsCard({
  title,
  rows,
}: {
  title: string
  rows: any[]
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 18,
        padding: 16,
        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 26,
          marginBottom: 14,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) auto',
          gap: 10,
          fontSize: 12,
          color: '#6b7280',
          paddingBottom: 10,
          borderBottom: '1px solid #e5e7eb',
          marginBottom: 4,
        }}
      >
        <div>Equipo</div>
        <div style={{ display: 'flex', gap: 12, fontWeight: 700 }}>
          <span>PJ</span>
          <span>G</span>
          <span>E</span>
          <span>P</span>
          <span>DG</span>
          <span>Pts</span>
        </div>
      </div>

      {rows.map((t: any, i: number) => (
        <div
          key={t.id ?? `${title}-${i}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) auto',
            gap: 10,
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: i === rows.length - 1 ? 'none' : '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <div style={{ width: 18, fontWeight: 700 }}>{i + 1}</div>

            {t.logo_url ? (
              <img
                src={t.logo_url}
                alt={t.team}
                style={{
                  width: 24,
                  height: 24,
                  objectFit: 'contain',
                  display: 'block',
                  flexShrink: 0,
                }}
              />
            ) : null}

            <div
              style={{
                fontWeight: 700,
                overflowWrap: 'anywhere',
              }}
            >
              {t.team}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              fontSize: 14,
              alignItems: 'center',
            }}
          >
            <span>{t.PJ}</span>
            <span>{t.PG}</span>
            <span>{t.PE}</span>
            <span>{t.PP}</span>
            <span>{t.DIF}</span>
            <span style={{ fontWeight: 800 }}>{t.PTS}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TablaPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [sports, setSports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: m } = await supabase.from('matches').select('*')
      const { data: t } = await supabase.from('teams').select('*')
      const { data: s } = await supabase.from('Sports').select('*')

      setMatches(m || [])
      setTeams(t || [])
      setSports(s || [])
      setLoading(false)
    }

    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [])

  const sportsMap = useMemo(() => {
    const map: Record<number, string> = {}
    sports.forEach((s) => {
      map[s.id] = s.display_name || s.name || 'Deporte'
    })
    return map
  }, [sports])

  const regularMatches = useMemo(() => {
    return matches
      .filter((m) => m.phase === 'regular')
      .sort((a, b) => {
        const jornadaA = getJornadaNumber(a) ?? 999
        const jornadaB = getJornadaNumber(b) ?? 999
        if (jornadaA !== jornadaB) return jornadaA - jornadaB
        return parseTimeRangeToMinutes(a.match_time) - parseTimeRangeToMinutes(b.match_time)
      })
  }, [matches])

  const matchesByJornada = useMemo(() => {
    const grouped: Record<string, any[]> = {}

    regularMatches.forEach((match) => {
      const label = getJornadaLabel(match)
      if (!grouped[label]) grouped[label] = []
      grouped[label].push(match)
    })

    return grouped
  }, [regularMatches])

  const generalStandings = useMemo(() => {
    const table: any = {}

    teams.forEach((t) => {
      table[t.id] = {
        id: t.id,
        team: t.name,
        logo_url: t.logo_url,
        group: getTeamGroup(t),
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
      .filter((m) => m.phase === 'regular' && m.status === 'submitted')
      .forEach((m) => {
        const a = table[m.team_a_id]
        const b = table[m.team_b_id]
        if (!a || !b) return

        const sa = Number(m.score_a ?? 0)
        const sb = Number(m.score_b ?? 0)

        a.PJ++
        b.PJ++

        a.PF += sa
        a.PC += sb
        b.PF += sb
        b.PC += sa

        if (sa > sb) {
          a.PG++
          a.PTS += 3
          b.PP++
        } else if (sb > sa) {
          b.PG++
          b.PTS += 3
          a.PP++
        } else {
          a.PE++
          b.PE++
          a.PTS++
          b.PTS++
        }
      })

    Object.values(table).forEach((t: any) => {
      t.DIF = t.PF - t.PC
    })

    return Object.values(table).sort((a: any, b: any) => {
      if (b.PTS !== a.PTS) return b.PTS - a.PTS
      if (b.DIF !== a.DIF) return b.DIF - a.DIF
      if (b.PF !== a.PF) return b.PF - a.PF
      return a.team.localeCompare(b.team)
    })
  }, [matches, teams])

  const groupStandings = useMemo(() => {
    const grouped: Record<string, any[]> = {}

    generalStandings.forEach((team: any) => {
      const group = team.group || 'Sin grupo'
      if (!grouped[group]) grouped[group] = []
      grouped[group].push(team)
    })

    Object.keys(grouped).forEach((group) => {
      grouped[group] = grouped[group].sort((a: any, b: any) => {
        if (b.PTS !== a.PTS) return b.PTS - a.PTS
        if (b.DIF !== a.DIF) return b.DIF - a.DIF
        if (b.PF !== a.PF) return b.PF - a.PF
        return a.team.localeCompare(b.team)
      })
    })

    return grouped
  }, [generalStandings])

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 860,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <a
        href="/"
        style={{
          display: 'inline-block',
          marginBottom: 16,
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

      <h1 style={{ marginTop: 0, marginBottom: 20 }}>Tabla del torneo</h1>

      {/* PARTIDOS POR JORNADA */}
      <section style={{ marginBottom: 28 }}>
        {Object.entries(matchesByJornada).map(([jornada, jornadaMatches]) => (
          <div key={jornada} style={{ marginBottom: 22 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 28,
                marginBottom: 12,
              }}
            >
              {jornada}
            </div>

            {jornadaMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                teams={teams}
                sportName={sportsMap[match.sport_id] || 'Deporte'}
              />
            ))}
          </div>
        ))}
      </section>

      {/* TABLA DE RESULTADOS */}
      <section style={{ marginBottom: 28 }}>
        {Object.entries(groupStandings).map(([groupName, rows]) => (
          <StandingsCard
            key={groupName}
            title={groupName}
            rows={rows}
          />
        ))}
      </section>

      {/* TABLA GENERAL */}
      <section>
        <StandingsCard title="Tabla general" rows={generalStandings} />
      </section>
    </main>
  )
}