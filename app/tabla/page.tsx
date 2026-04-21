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

function getJornadaNumber(match: any) {
  if (match.phase !== 'regular') return null
  const raw = match.match_code?.split('-')[0] || ''
  const clean = raw.replace('J', '')
  const num = Number(clean)
  return Number.isNaN(num) ? null : num
}

function getPhaseTitle(phase: string) {
  if (phase === 'quarterfinal') return 'Cuartos de final'
  if (phase === 'semifinal') return 'Semifinal'
  if (phase === 'final') return 'Final'
  return 'Partido'
}

function getMatchTitle(match: any) {
  if (match.phase === 'regular') {
    const jornada = getJornadaNumber(match)
    return jornada ? `Jornada ${jornada} — Fase regular` : 'Jornada — Fase regular'
  }
  return getPhaseTitle(match.phase)
}

function getStatusKey(match: any) {
  if (match.status === 'submitted') return 'finished'
  if (match.started_at) return 'live'
  return 'pending'
}

function getStatusLabel(match: any) {
  const key = getStatusKey(match)
  if (key === 'finished') return 'FINALIZADO'
  if (key === 'live') return 'EN JUEGO'
  return 'PENDIENTE'
}

function getStatusStyles(match: any) {
  const key = getStatusKey(match)

  if (key === 'finished') {
    return {
      background: '#dcfce7',
      color: '#166534',
      border: '#86efac',
      className: 'status-finished',
      cardBorder: '#bbf7d0',
      cardBackground: '#ffffff',
      cardShadow: '0 8px 20px rgba(34,197,94,0.08)',
      cardClassName: 'card-finished',
    }
  }

  if (key === 'live') {
    return {
      background: '#dbeafe',
      color: '#1d4ed8',
      border: '#93c5fd',
      className: 'status-live',
      cardBorder: '#93c5fd',
      cardBackground: '#ffffff',
      cardShadow: '0 10px 24px rgba(59,130,246,0.12)',
      cardClassName: 'card-live',
    }
  }

  return {
    background: '#fef3c7',
    color: '#92400e',
    border: '#fcd34d',
    className: 'status-pending',
    cardBorder: '#fcd34d',
    cardBackground: '#ffffff',
    cardShadow: '0 8px 18px rgba(245,158,11,0.08)',
    cardClassName: 'card-pending',
  }
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
    a: '0',
    b: '0',
  }
}

function getTeamGroup(team: any) {
  return team?.group_name || team?.group || team?.grupo || 'Sin grupo'
}

function LiveBall() {
  return (
    <div
      className="live-ball"
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 35% 35%, #ffffff 0%, #f3f4f6 38%, #111827 39%, #111827 52%, #f3f4f6 53%, #f9fafb 100%)',
        border: '1px solid rgba(0,0,0,0.18)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
        display: 'inline-block',
        marginRight: 6,
        flexShrink: 0,
      }}
    />
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
  const style = getStatusStyles(match)
  const statusKey = getStatusKey(match)
  const isFinal = match.phase === 'final'

  return (
    <div
      className={style.cardClassName}
      style={{
        borderRadius: isFinal ? 20 : 18,
        padding: 14,
        marginBottom: 14,
        background: isFinal ? '#fffaf0' : style.cardBackground,
        border: `1px solid ${isFinal ? '#f59e0b' : style.cardBorder}`,
        boxShadow: isFinal ? '0 12px 26px rgba(245,158,11,0.14)' : style.cardShadow,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isFinal && (
        <>
          <div
            className="final-shine"
            style={{
              position: 'absolute',
              top: 0,
              left: '-35%',
              width: '28%',
              height: '100%',
              background:
                'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.58) 50%, rgba(255,255,255,0) 100%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 12,
              fontSize: 22,
              opacity: 0.18,
              pointerEvents: 'none',
            }}
          >
            🏆
          </div>
        </>
      )}

      <div
        style={{
          fontWeight: 800,
          fontSize: 16,
          marginBottom: 8,
          lineHeight: 1.2,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {getMatchTitle(match)}
      </div>

      <div
        style={{
          fontSize: 12,
          color: '#6b7280',
          marginBottom: 4,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {sportName}
      </div>

      {match.match_time && (
        <div
          style={{
            fontSize: 12,
            color: '#6b7280',
            marginBottom: 12,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {match.match_time}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          position: 'relative',
          zIndex: 1,
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
          {teamA?.logo_url ? (
            <img
              src={teamA.logo_url}
              alt={teamA.name}
              style={{
                width: isFinal ? 32 : 28,
                height: isFinal ? 32 : 28,
                objectFit: 'contain',
                display: 'block',
                flexShrink: 0,
              }}
            />
          ) : null}
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              lineHeight: 1.1,
              overflowWrap: 'anywhere',
            }}
          >
            {teamA?.name || 'Equipo'}
          </div>
        </div>

        <div
          className={statusKey === 'live' ? 'score-live' : ''}
          style={{
            fontSize: isFinal ? 30 : 28,
            fontWeight: 900,
            lineHeight: 1,
            minWidth: 72,
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {score.a} - {score.b}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'flex-end',
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              lineHeight: 1.1,
              overflowWrap: 'anywhere',
              textAlign: 'right',
            }}
          >
            {teamB?.name || 'Equipo'}
          </div>
          {teamB?.logo_url ? (
            <img
              src={teamB.logo_url}
              alt={teamB.name}
              style={{
                width: isFinal ? 32 : 28,
                height: isFinal ? 32 : 28,
                objectFit: 'contain',
                display: 'block',
                flexShrink: 0,
              }}
            />
          ) : null}
        </div>
      </div>

      <div
        className={style.className}
        style={{
          marginTop: 4,
          fontSize: 11,
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          padding: '5px 11px',
          borderRadius: 999,
          background: style.background,
          color: style.color,
          border: `1px solid ${style.border}`,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {statusKey === 'live' ? <LiveBall /> : null}
        {getStatusLabel(match)}
      </div>
    </div>
  )
}

function CompactStandingsCard({
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
          <span>DP</span>
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

function FullScheduleTable({
  title,
  times,
  sportCols,
  rowsByTime,
  teams,
}: {
  title: string
  times: string[]
  sportCols: { id: number; name: string }[]
  rowsByTime: Record<string, Record<number, any>>
  teams: any[]
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

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            minWidth: 1100,
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr style={{ background: '#111', color: 'white' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Hora</th>
              {sportCols.map((s) => (
                <th key={s.id} style={{ padding: 10, textAlign: 'left' }}>
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {times.map((time, i) => (
              <tr
                key={time}
                style={{ background: i % 2 ? '#f9fafb' : 'white' }}
              >
                <td
                  style={{
                    padding: 10,
                    fontWeight: 700,
                    verticalAlign: 'top',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {time}
                </td>

                {sportCols.map((sport) => {
                  const match = rowsByTime[time]?.[sport.id]

                  if (!match) {
                    return (
                      <td
                        key={sport.id}
                        style={{ padding: 10, textAlign: 'center', verticalAlign: 'top' }}
                      >
                        —
                      </td>
                    )
                  }

                  const teamA = getTeam(teams, match.team_a_id)
                  const teamB = getTeam(teams, match.team_b_id)
                  const score = getDisplayScores(match)
                  const style = getStatusStyles(match)
                  const statusKey = getStatusKey(match)

                  return (
                    <td
                      key={sport.id}
                      style={{ padding: 10, verticalAlign: 'top' }}
                    >
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                        {getMatchTitle(match)}
                      </div>

                      <div style={{ marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {teamA?.logo_url ? (
                            <img
                              src={teamA.logo_url}
                              alt={teamA.name}
                              style={{
                                width: 22,
                                height: 22,
                                objectFit: 'contain',
                                display: 'block',
                              }}
                            />
                          ) : null}
                          <span>{teamA?.name || 'Equipo'}</span>
                        </div>
                      </div>

                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 18,
                          textAlign: 'center',
                          margin: '6px 0',
                        }}
                      >
                        {score.a} - {score.b}
                      </div>

                      <div style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {teamB?.logo_url ? (
                            <img
                              src={teamB.logo_url}
                              alt={teamB.name}
                              style={{
                                width: 22,
                                height: 22,
                                objectFit: 'contain',
                                display: 'block',
                              }}
                            />
                          ) : null}
                          <span>{teamB?.name || 'Equipo'}</span>
                        </div>
                      </div>

                      <div>
                        <span
                          className={style.className}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: style.background,
                            color: style.color,
                            border: `1px solid ${style.border}`,
                            padding: '2px 6px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {statusKey === 'live' ? <LiveBall /> : null}
                          {getStatusLabel(match)}
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
  )
}

export default function TablaPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [sports, setSports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: m } = await supabase.from('matches').select('*')
      const { data: t } = await supabase.from('teams').select('*')
      const { data: s } = await supabase.from('Sports').select('*')

      if (!mounted) return
      setMatches(m || [])
      setTeams(t || [])
      setSports(s || [])
      setLoading(false)
    }

    load()
    const interval = setInterval(load, 5000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const sportsMap = useMemo(() => {
    const map: Record<number, string> = {}
    sports.forEach((s) => {
      map[s.id] = s.display_name || s.name || 'Deporte'
    })
    return map
  }, [sports])

  const sportCols = useMemo(() => {
    return sports.map((s) => ({
      id: s.id,
      name: s.display_name || s.name,
    }))
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

  const quarterMatches = useMemo(() => {
    return matches
      .filter((m) => m.phase === 'quarterfinal')
      .sort((a, b) => parseTimeRangeToMinutes(a.match_time) - parseTimeRangeToMinutes(b.match_time))
  }, [matches])

  const semiMatches = useMemo(() => {
    return matches
      .filter((m) => m.phase === 'semifinal')
      .sort((a, b) => parseTimeRangeToMinutes(a.match_time) - parseTimeRangeToMinutes(b.match_time))
  }, [matches])

  const finalMatches = useMemo(() => {
    return matches
      .filter((m) => m.phase === 'final')
      .sort((a, b) => parseTimeRangeToMinutes(a.match_time) - parseTimeRangeToMinutes(b.match_time))
  }, [matches])

  const matchesByJornada = useMemo(() => {
    const grouped: Record<string, any[]> = {}

    regularMatches.forEach((match) => {
      const label = getMatchTitle(match)
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

  const regularTimes = useMemo(() => {
    const unique = Array.from(
      new Set(regularMatches.map((m) => m.match_time || 'Sin horario'))
    )
    return unique.sort((a, b) => parseTimeRangeToMinutes(a) - parseTimeRangeToMinutes(b))
  }, [regularMatches])

  const regularRowsByTime = useMemo(() => {
    const rows: Record<string, Record<number, any>> = {}

    regularTimes.forEach((time) => {
      rows[time] = {}
      sportCols.forEach((sport) => {
        const match = regularMatches.find(
          (m) =>
            (m.match_time || 'Sin horario') === time &&
            m.sport_id === sport.id
        )
        if (match) rows[time][sport.id] = match
      })
    })

    return rows
  }, [regularTimes, sportCols, regularMatches])

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fifaPulseBlue {
          0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.35); }
          70% { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }

        @keyframes fifaPulseAmber {
          0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.28); }
          70% { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
          100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }

        @keyframes fifaGlowBlue {
          0% { box-shadow: 0 0 0 rgba(59,130,246,0.15); }
          50% { box-shadow: 0 0 16px rgba(59,130,246,0.22); }
          100% { box-shadow: 0 0 0 rgba(59,130,246,0.15); }
        }

        @keyframes fifaGlowGreen {
          0% { box-shadow: 0 0 0 rgba(34,197,94,0.12); }
          50% { box-shadow: 0 0 14px rgba(34,197,94,0.18); }
          100% { box-shadow: 0 0 0 rgba(34,197,94,0.12); }
        }

        @keyframes fifaScorePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        @keyframes finalShineMove {
          0% { transform: translateX(0); }
          100% { transform: translateX(420%); }
        }

        @keyframes ballBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-1px) rotate(12deg); }
          50% { transform: translateY(-2px) rotate(24deg); }
          75% { transform: translateY(-1px) rotate(12deg); }
        }

        .status-live {
          animation: fifaPulseBlue 1.8s infinite;
        }

        .status-pending {
          animation: fifaPulseAmber 2.4s infinite;
        }

        .status-finished {
          animation: fifaGlowGreen 2.8s ease-in-out infinite;
        }

        .card-live {
          animation: fifaGlowBlue 2.2s ease-in-out infinite;
        }

        .score-live {
          animation: fifaScorePop 1.5s ease-in-out infinite;
        }

        .final-shine {
          animation: finalShineMove 2.8s linear infinite;
        }

        .live-ball {
          animation: ballBounce 1s ease-in-out infinite;
        }
      `}</style>

      <main
        style={{
          padding: 14,
          maxWidth: 760,
          margin: '0 auto',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            borderRadius: 22,
            overflow: 'hidden',
            marginBottom: 18,
            boxShadow: '0 16px 34px rgba(0,0,0,0.22)',
            position: 'relative',
          }}
        >
          <img
            src="/header-tabla-shivte.png"
            alt="Resultados Calendario Clasificación"
            style={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </div>

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

        <section style={{ marginBottom: 28 }}>
          {Object.entries(matchesByJornada).map(([jornada, jornadaMatches]) => (
            <div key={jornada} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 26,
                  marginBottom: 12,
                  lineHeight: 1.05,
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

        <section style={{ marginBottom: 28 }}>
          {quarterMatches.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 26,
                  marginBottom: 12,
                }}
              >
                Cuartos de final
              </div>
              {quarterMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  teams={teams}
                  sportName={sportsMap[match.sport_id] || 'Deporte'}
                />
              ))}
            </div>
          )}

          {semiMatches.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 26,
                  marginBottom: 12,
                }}
              >
                Semifinal
              </div>
              {semiMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  teams={teams}
                  sportName={sportsMap[match.sport_id] || 'Deporte'}
                />
              ))}
            </div>
          )}

          {finalMatches.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 26,
                  marginBottom: 12,
                }}
              >
                Final
              </div>
              {finalMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  teams={teams}
                  sportName={sportsMap[match.sport_id] || 'Deporte'}
                />
              ))}
            </div>
          )}
        </section>

        <section style={{ marginBottom: 28 }}>
          <CompactStandingsCard
            title="Clasificación Shivte WC 26"
            rows={generalStandings}
          />
        </section>

        <section style={{ marginBottom: 28 }}>
          <FullScheduleTable
            title="Tabla completa de jornadas"
            times={regularTimes}
            sportCols={sportCols}
            rowsByTime={regularRowsByTime}
            teams={teams}
          />
        </section>
      </main>
    </>
  )
}