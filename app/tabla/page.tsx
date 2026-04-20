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

function getJornadaLabel(match: any) {
  if (match.phase === 'regular') {
    const jornada = match.match_code?.split('-')[0]?.replace('J', '')
    return `Jornada ${jornada}`
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

function cardStyle() {
  return {
    background: 'white',
    borderRadius: 20,
    padding: 24,
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    marginTop: 20,
  } as const
}

function TeamMini({
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
        gap: 6,
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
            width: 22,
            height: 22,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : null}
      <span>{team?.name || 'Equipo'}</span>
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

  const regular = useMemo(
    () => matches.filter((m) => m.phase === 'regular'),
    [matches]
  )

  const sportCols = useMemo(
    () =>
      sports.map((s) => ({
        id: s.id,
        name: s.display_name || s.name,
      })),
    [sports]
  )

  const times = useMemo(() => {
    const uniqueTimes = Array.from(
      new Set(regular.map((m) => m.match_time || 'Sin horario'))
    )

    return uniqueTimes.sort(
      (a, b) => parseTimeRangeToMinutes(a) - parseTimeRangeToMinutes(b)
    )
  }, [regular])

  const matrix = useMemo(() => {
    return times.map((time) => {
      const row: any = { time, cells: {} }

      sportCols.forEach((sport) => {
        const match = regular.find(
          (m) =>
            (m.match_time || 'Sin horario') === time &&
            m.sport_id === sport.id
        )
        row.cells[sport.id] = match || null
      })

      return row
    })
  }, [times, sportCols, regular])

  const standings = useMemo(() => {
    const table: any = {}

    teams.forEach((t) => {
      table[t.id] = {
        id: t.id,
        team: t.name,
        logo_url: t.logo_url,
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

  const quarters = useMemo(
    () =>
      matches
        .filter((m) => m.phase === 'quarterfinal')
        .sort(
          (a, b) =>
            parseTimeRangeToMinutes(a.match_time) -
            parseTimeRangeToMinutes(b.match_time)
        ),
    [matches]
  )

  const semis = useMemo(
    () =>
      matches
        .filter((m) => m.phase === 'semifinal')
        .sort(
          (a, b) =>
            parseTimeRangeToMinutes(a.match_time) -
            parseTimeRangeToMinutes(b.match_time)
        ),
    [matches]
  )

  const finals = useMemo(
    () =>
      matches
        .filter((m) => m.phase === 'final')
        .sort(
          (a, b) =>
            parseTimeRangeToMinutes(a.match_time) -
            parseTimeRangeToMinutes(b.match_time)
        ),
    [matches]
  )

  if (loading) {
    return <div style={{ padding: 20 }}>Cargando...</div>
  }

  return (
    <main style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
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

      <h1 style={{ marginBottom: 20 }}>Tabla del torneo</h1>

      <div
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}
      >
        <a
          href="#calendario"
          style={{
            textDecoration: 'none',
            background: '#111827',
            color: 'white',
            padding: '10px 16px',
            borderRadius: 999,
            fontWeight: 'bold',
          }}
        >
          Calendario
        </a>
        <a
          href="#posiciones"
          style={{
            textDecoration: 'none',
            background: '#1d4ed8',
            color: 'white',
            padding: '10px 16px',
            borderRadius: 999,
            fontWeight: 'bold',
          }}
        >
          Posiciones
        </a>
        <a
          href="#eliminacion"
          style={{
            textDecoration: 'none',
            background: '#059669',
            color: 'white',
            padding: '10px 16px',
            borderRadius: 999,
            fontWeight: 'bold',
          }}
        >
          Eliminación
        </a>
      </div>

      <div id="calendario" style={{ ...cardStyle(), scrollMarginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Calendario</h2>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              minWidth: 980,
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr style={{ background: '#111', color: 'white' }}>
                <th style={{ padding: 10 }}>Hora</th>
                {sportCols.map((s) => (
                  <th key={s.id} style={{ padding: 10 }}>
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {matrix.map((row, i) => (
                <tr
                  key={row.time}
                  style={{ background: i % 2 ? '#f9fafb' : 'white' }}
                >
                  <td style={{ padding: 10, fontWeight: 'bold', verticalAlign: 'top' }}>
                    {row.time}
                  </td>

                  {sportCols.map((s) => {
                    const m = row.cells[s.id]

                    if (!m) {
                      return (
                        <td key={s.id} style={{ padding: 10, textAlign: 'center' }}>
                          —
                        </td>
                      )
                    }

                    const style = getStatusStyles(m)
                    const score = getDisplayScores(m)
                    const teamA = getTeam(teams, m.team_a_id)
                    const teamB = getTeam(teams, m.team_b_id)

                    return (
                      <td key={s.id} style={{ padding: 10, verticalAlign: 'top' }}>
                        <div style={{ fontSize: 12 }}>{getJornadaLabel(m)}</div>

                        <div style={{ marginTop: 6 }}>
                          <TeamMini team={teamA} />
                        </div>

                        <div
                          style={{
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: 18,
                            margin: '6px 0',
                          }}
                        >
                          {score.a} - {score.b}
                        </div>

                        <div>
                          <TeamMini team={teamB} />
                        </div>

                        <div style={{ marginTop: 8 }}>
                          <span
                            style={{
                              ...style,
                              padding: '2px 6px',
                              borderRadius: 6,
                              fontSize: 10,
                            }}
                          >
                            {getStatusLabel(m)}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div id="posiciones" style={{ ...cardStyle(), scrollMarginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Posiciones</h2>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: 760,
              borderCollapse: 'collapse',
            }}
            border={1}
          >
            <thead>
              <tr>
                <th>#</th>
                <th>Equipo</th>
                <th>PJ</th>
                <th>PG</th>
                <th>PE</th>
                <th>PP</th>
                <th>PF</th>
                <th>PC</th>
                <th>DIF</th>
                <th>PTS</th>
              </tr>
            </thead>

            <tbody>
              {standings.map((t: any, i) => (
                <tr key={t.id ?? i}>
                  <td>{i + 1}</td>
                  <td>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {t.logo_url ? (
                        <img
                          src={t.logo_url}
                          alt={t.team}
                          style={{
                            width: 24,
                            height: 24,
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      ) : null}
                      <span>{t.team}</span>
                    </div>
                  </td>
                  <td>{t.PJ}</td>
                  <td>{t.PG}</td>
                  <td>{t.PE}</td>
                  <td>{t.PP}</td>
                  <td>{t.PF}</td>
                  <td>{t.PC}</td>
                  <td>{t.DIF}</td>
                  <td>
                    <b>{t.PTS}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 20 }}>
          {standings.map((t: any, i) => (
            <div
              key={`mobile-${t.id ?? i}`}
              style={{
                border: '1px solid #ddd',
                borderRadius: 14,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: 18,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {t.logo_url ? (
                  <img
                    src={t.logo_url}
                    alt={t.team}
                    style={{
                      width: 28,
                      height: 28,
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                ) : null}
                <span>
                  #{i + 1} {t.team}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div><strong>PJ</strong><br />{t.PJ}</div>
                <div><strong>PG</strong><br />{t.PG}</div>
                <div><strong>PE</strong><br />{t.PE}</div>
                <div><strong>PP</strong><br />{t.PP}</div>
                <div><strong>PTS</strong><br />{t.PTS}</div>
                <div><strong>PF</strong><br />{t.PF}</div>
                <div><strong>PC</strong><br />{t.PC}</div>
                <div><strong>DIF</strong><br />{t.DIF}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="eliminacion" style={{ ...cardStyle(), scrollMarginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Eliminación</h2>

        {[
          { title: 'Cuartos', list: quarters },
          { title: 'Semis', list: semis },
          { title: 'Final', list: finals },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: 24 }}>
            <h3>{section.title}</h3>
            {section.list.length === 0 && <div>No hay partidos todavía.</div>}
            {section.list.map((m: any) => {
              const score = getDisplayScores(m)
              const teamA = getTeam(teams, m.team_a_id)
              const teamB = getTeam(teams, m.team_b_id)
              return (
                <div
                  key={m.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                    {m.match_time || 'Sin horario'}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <TeamMini team={teamA} align="left" />
                    <div style={{ fontWeight: 'bold', fontSize: 20 }}>
                      {score.a} - {score.b}
                    </div>
                    <TeamMini team={teamB} align="right" />
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        ...getStatusStyles(m),
                        padding: '2px 6px',
                        borderRadius: 6,
                        fontSize: 10,
                      }}
                    >
                      {getStatusLabel(m)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </main>
  )
}