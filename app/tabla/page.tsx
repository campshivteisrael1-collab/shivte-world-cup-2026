'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type MatchRow = any
type TeamRow = any
type SportRow = any
type MatchEventRow = any
type FinalStateRow = any
type TablaView = 'jornadas' | 'clasificacion' | 'eliminatorias' | 'final'

function getTeam(teams: TeamRow[], id: number) {
  return teams.find((t) => t.id === id) || null
}

function getJornadaNumber(match: MatchRow) {
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

function getMatchTitle(match: MatchRow) {
  if (match.phase === 'regular') {
    const jornada = getJornadaNumber(match)
    return jornada ? `Jornada ${jornada} — Fase regular` : 'Jornada — Fase regular'
  }
  return getPhaseTitle(match.phase)
}

function hasFinalScore(match: MatchRow | null | undefined) {
  if (!match) return false

  return (
    match.score_a !== null &&
    match.score_a !== undefined &&
    match.score_b !== null &&
    match.score_b !== undefined
  )
}

function getStatusKey(match: MatchRow) {
  if (hasFinalScore(match)) return 'finished'
  if (match.started_at) return 'live'
  return 'pending'
}

function getStatusLabel(match: MatchRow) {
  const key = getStatusKey(match)
  if (key === 'finished') return 'FINALIZADO'
  if (key === 'live') return 'EN JUEGO'
  return 'POR JUGAR'
}

function getStatusTheme(match: MatchRow) {
  const key = getStatusKey(match)

  if (key === 'finished') {
    return {
      badgeBg: '#dcfce7',
      badgeColor: '#166534',
      badgeBorder: '#86efac',
      cardBg: '#f0fdf4',
      cardBorder: '#bbf7d0',
      badgeClass: 'status-finished',
      cardClass: 'card-finished',
    }
  }

  if (key === 'live') {
    return {
      badgeBg: '#dbeafe',
      badgeColor: '#1d4ed8',
      badgeBorder: '#93c5fd',
      cardBg: '#eff6ff',
      cardBorder: '#93c5fd',
      badgeClass: 'status-live',
      cardClass: 'card-live',
    }
  }

  return {
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    badgeBorder: '#fcd34d',
    cardBg: '#ffffff',
    cardBorder: '#e5e7eb',
    badgeClass: 'status-pending',
    cardClass: 'card-pending',
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

function getDurationSeconds(matchTime: string | null | undefined) {
  if (!matchTime) return 0

  const parts = matchTime.split('-')
  if (parts.length < 2) return 0

  const start = parseTimeRangeToMinutes(parts[0].trim())
  const end = parseTimeRangeToMinutes(parts[1].trim())

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0

  return (end - start) * 60
}

function getDisplayScores(match: MatchRow) {
  if (hasFinalScore(match)) {
    return {
      a: Number(match.score_a),
      b: Number(match.score_b),
    }
  }

  if (match.started_at) {
    return {
      a: Number(match.live_score_a ?? 0),
      b: Number(match.live_score_b ?? 0),
    }
  }

  return {
    a: 0,
    b: 0,
  }
}

function getTeamGroup(team: TeamRow) {
  return team?.group_name || team?.group || team?.grupo || 'Sin grupo'
}

function getTimerText(match: MatchRow, nowMs: number) {
  if (!match.started_at) return null
  if (hasFinalScore(match)) return null

  const totalSeconds = getDurationSeconds(match.match_time)
  if (!totalSeconds) return null

  const started = new Date(match.started_at).getTime()
  const elapsed = Math.max(0, Math.floor((nowMs - started) / 1000))
  const remaining = Math.max(0, totalSeconds - elapsed)

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getWinnerTeam(match: MatchRow | null | undefined) {
  if (!match) return null
  if (!hasFinalScore(match)) return null

  const scoreA = Number(match.score_a ?? 0)
  const scoreB = Number(match.score_b ?? 0)

  if (scoreA > scoreB) return match._team_a_display || null
  if (scoreB > scoreA) return match._team_b_display || null

  return null
}

function makePlaceholderTeam(name: string) {
  return {
    id: null,
    name,
    logo_url: null,
  }
}


function getFinalStageLabel(stage: string | null | undefined) {
  if (stage === 'first_half') return '1er tiempo'
  if (stage === 'halftime') return 'Medio tiempo'
  if (stage === 'second_half') return '2do tiempo'
  if (stage === 'extra_time') return 'Tiempo extra'
  if (stage === 'penalties') return 'Penales'
  return 'Final'
}

function getFinalEventLabel(type: string | null | undefined) {
  if (type === 'goal') return 'Gol'
  if (type === 'yellow_card') return 'Amarilla'
  if (type === 'red_card') return 'Roja'
  if (type === 'own_goal') return 'Autogol'
  if (type === 'goal_cancelled') return 'Gol anulado'
  if (type === 'injury') return 'Lesión'
  if (type === 'pause') return 'Tiempo agregado'
  if (type === 'note') return 'Nota'
  return 'Evento'
}

function getFinalEventIcon(type: string | null | undefined) {
  if (type === 'goal') return '⚽'
  if (type === 'yellow_card') return '🟨'
  if (type === 'red_card') return '🟥'
  if (type === 'own_goal') return '↩️'
  if (type === 'goal_cancelled') return '🚫'
  if (type === 'injury') return '🚑'
  if (type === 'pause') return '⏱️'
  if (type === 'note') return '📝'
  return '•'
}

function getFinalEventColor(type: string | null | undefined) {
  if (type === 'goal') return '#16a34a'
  if (type === 'yellow_card') return '#f59e0b'
  if (type === 'red_card') return '#dc2626'
  if (type === 'own_goal') return '#9333ea'
  if (type === 'goal_cancelled') return '#6b7280'
  if (type === 'injury') return '#ea580c'
  if (type === 'pause') return '#2563eb'
  return '#111827'
}

function getStageBaseSeconds(finalState: FinalStateRow | null | undefined, stage: string | null | undefined) {
  if (stage === 'first_half') return Number(finalState?.first_half_seconds ?? 720)
  if (stage === 'second_half') return Number(finalState?.second_half_seconds ?? 720)
  if (stage === 'extra_time') return Number(finalState?.extra_time_seconds ?? 300)
  if (stage === 'halftime') return Number(finalState?.halftime_seconds ?? 300)
  return 0
}

function getStageOffsetSeconds(finalState: FinalStateRow | null | undefined, stage: string | null | undefined) {
  const first = Number(finalState?.first_half_seconds ?? 720)
  const second = Number(finalState?.second_half_seconds ?? 720)
  if (stage === 'second_half') return first
  if (stage === 'extra_time') return first + second
  return 0
}

function formatBroadcastClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const secs = safe % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatAddedMinutes(seconds: number) {
  if (!seconds || seconds <= 0) return null
  return `+${Math.max(1, Math.ceil(seconds / 60))}`
}

function getFinalClockInfo(finalState: FinalStateRow | null | undefined, nowMs: number, isFinished: boolean, match?: MatchRow) {
  const stage = finalState?.stage || 'pending'
  const matchIsClean =
    !match?.started_at ||
    getStatusKey(match) === 'pending' ||
    match?.status === 'pending' ||
    finalState?.is_reset === true

  if (!finalState || stage === 'pending' || matchIsClean) {
    return {
      clock: '00:00',
      addedLabel: null as string | null,
      stageLabel: 'Por jugar',
      isAddedTime: false,
      isRunning: false,
      halftimeClock: null as string | null,
    }
  }

  if (stage === 'penalties') {
    return {
      clock: 'PENALES',
      addedLabel: null as string | null,
      stageLabel: 'Penales',
      isAddedTime: false,
      isRunning: false,
      halftimeClock: null as string | null,
    }
  }

  const baseSeconds = getStageBaseSeconds(finalState, stage)
  const offsetSeconds = getStageOffsetSeconds(finalState, stage)
  const addedSeconds = Math.max(0, Number(finalState?.added_seconds ?? 0))
  const startRaw =
    stage === 'halftime'
      ? finalState?.halftime_started_at || finalState?.stage_started_at
      : finalState?.stage_started_at

  if (!startRaw || !baseSeconds) {
    return {
      clock: stage === 'halftime' ? 'MEDIO TIEMPO' : formatBroadcastClock(offsetSeconds),
      addedLabel: null as string | null,
      stageLabel: getFinalStageLabel(stage),
      isAddedTime: false,
      isRunning: false,
      halftimeClock: stage === 'halftime' ? '05:00' : null,
    }
  }

  const elapsedStage = Math.max(0, Math.floor((nowMs - new Date(startRaw).getTime()) / 1000))

  if (stage === 'halftime') {
    const remaining = Math.max(0, baseSeconds - elapsedStage)
    return {
      clock: 'MEDIO TIEMPO',
      addedLabel: null as string | null,
      stageLabel: 'Medio tiempo',
      isAddedTime: false,
      isRunning: remaining > 0 && !isFinished,
      halftimeClock: formatBroadcastClock(remaining),
    }
  }

  const stageLimit = baseSeconds + addedSeconds
  const cappedStageSeconds = isFinished
    ? stageLimit
    : Math.min(elapsedStage, stageLimit)
  const isAddedTime = cappedStageSeconds >= baseSeconds && addedSeconds > 0
  const isStillRunning = !isFinished && elapsedStage < stageLimit

  return {
    clock: formatBroadcastClock(offsetSeconds + cappedStageSeconds),
    addedLabel: isAddedTime ? formatAddedMinutes(addedSeconds) : null,
    stageLabel: getFinalStageLabel(stage),
    isAddedTime,
    isRunning: isStillRunning,
    halftimeClock: null as string | null,
  }
}

function parseMinuteValue(value: string | null | undefined) {
  if (!value) return null
  const match = String(value).match(/(\d+)/)
  if (!match) return null
  const minute = Number(match[1])
  return Number.isFinite(minute) ? minute : null
}

function getEventDisplayMinute(event: MatchEventRow, finalState: FinalStateRow | null | undefined) {
  const minute = parseMinuteValue(event.minute)
  if (minute === null) return ''

  const offsetMinutes = Math.floor(getStageOffsetSeconds(finalState, event.stage) / 60)
  const baseMinutes = Math.floor(getStageBaseSeconds(finalState, event.stage) / 60)

  if (offsetMinutes > 0 && minute <= baseMinutes) {
    return `${offsetMinutes + minute}'`
  }

  return `${minute}'`
}

function getPublicFinalEvents(events: MatchEventRow[], match: MatchRow, finalState: FinalStateRow | null | undefined) {
  const matchIsClean = !match?.started_at || getStatusKey(match) === 'pending' || finalState?.is_reset === true
  if (matchIsClean) return []
  return events.filter((event) => event.event_type !== 'pause' && event.event_type !== 'note')
}

function getFinalScoreFromEvents(match: MatchRow, events: MatchEventRow[], finalState: FinalStateRow | null | undefined) {
  const matchIsClean = !match?.started_at || getStatusKey(match) === 'pending' || finalState?.is_reset === true
  if (matchIsClean) return { a: 0, b: 0 }
  const ordered = [...events].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  const lastScoreEvent = ordered.find((event) => event.score_a !== null && event.score_a !== undefined && event.score_b !== null && event.score_b !== undefined)
  if (lastScoreEvent) return { a: Number(lastScoreEvent.score_a ?? 0), b: Number(lastScoreEvent.score_b ?? 0) }
  return getDisplayScores(match)
}

function getWinnerName(match: MatchRow, teamA: any, teamB: any, score: { a: number; b: number }) {
  if (match?.winner_team_id && teamA?.id === match.winner_team_id) return teamA?.name || 'Equipo A'
  if (match?.winner_team_id && teamB?.id === match.winner_team_id) return teamB?.name || 'Equipo B'
  if (score.a > score.b) return teamA?.name || 'Equipo A'
  if (score.b > score.a) return teamB?.name || 'Equipo B'
  return 'Campeón por definir'
}

function getTeamCoach(team: any) {
  const coach =
    team?.coach_name ||
    team?.dt_name ||
    team?.director_tecnico ||
    team?.technical_director ||
    team?.manager_name ||
    team?.coach ||
    team?.dt ||
    team?.entrenador ||
    team?.entrenador_name ||
    team?.responsable ||
    team?.head_coach

  if (typeof coach === 'object') return getReadableName(coach) || 'DT pendiente'
  return coach || 'DT pendiente'
}

function getTeamPlayers(team: any) {
  const raw =
    team?.players ||
    team?.player_names ||
    team?.roster ||
    team?.plantel ||
    team?.jugadores ||
    team?.players_text ||
    team?.jugadores_text ||
    team?.roster_text ||
    team?.plantel_text

  if (Array.isArray(raw)) {
    return raw
      .map((p) => (typeof p === 'object' ? getReadableName(p) : String(p)))
      .map((p) => p.trim())
      .filter(Boolean)
  }

  if (typeof raw === 'string') return raw.split(/\n|,|;/).map((p) => p.trim()).filter(Boolean)
  return []
}

function getReadableName(row: any) {
  if (!row) return ''
  return (
    row.name ||
    row.full_name ||
    row.display_name ||
    row.nombre ||
    row.referee_name ||
    row.arbitro ||
    row.email ||
    ''
  )
}

function getMatchReferees(match: MatchRow, referees: any[] = []) {
  const raw =
    match?.referee_names ||
    match?.referees ||
    match?.referee_name ||
    match?.arbitros ||
    match?.arbitro

  if (Array.isArray(raw)) {
    const values = raw
      .map((r) => (typeof r === 'object' ? getReadableName(r) : String(r)))
      .filter(Boolean)
    if (values.length > 0) return values
  }

  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/\n|,|;/).map((r) => r.trim()).filter(Boolean)
  }

  const refereeId = match?.referee_id || match?.arbitro_id || match?.refereeId
  const referee = referees.find((r) => {
    const ids = [r?.id, r?.referee_id, r?.profile_id, r?.user_id].map((value) => String(value || ''))
    return ids.includes(String(refereeId || ''))
  })

  const refereeName = getReadableName(referee)
  if (refereeName) return [refereeName]

  return refereeId ? [`Árbitro asignado`] : ['Árbitro pendiente']
}


function getGoalDisplayTeam(event: MatchEventRow | null | undefined, teamA: any, teamB: any) {
  if (!event) return null
  if (event.event_type === 'own_goal') {
    return event.team_side === 'A' ? teamB : teamA
  }
  if (event.team_side === 'A') return teamA
  if (event.team_side === 'B') return teamB
  return null
}

function getGoalDisplayTeamName(event: MatchEventRow | null | undefined, teamA: any, teamB: any) {
  const team = getGoalDisplayTeam(event, teamA, teamB)
  return team?.name || event?.team_name || 'Gran Final'
}

function getGoalDisplayLogo(event: MatchEventRow | null | undefined, teamA: any, teamB: any) {
  const team = getGoalDisplayTeam(event, teamA, teamB)
  return team?.logo_url || null
}

function LiveBall() {
  return (
    <span
      className="live-ball"
      style={{
        width: 10,
        height: 10,
        display: 'inline-block',
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 35% 35%, #ffffff 0%, #f3f4f6 38%, #111827 39%, #111827 52%, #ffffff 53%, #ffffff 100%)',
        border: '1px solid rgba(0,0,0,0.15)',
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
  nowMs,
}: {
  match: MatchRow
  teams: TeamRow[]
  sportName: string
  nowMs: number
}) {
  const teamA = match._team_a_display || getTeam(teams, match.team_a_id)
  const teamB = match._team_b_display || getTeam(teams, match.team_b_id)
  const score = getDisplayScores(match)
  const theme = getStatusTheme(match)
  const statusKey = getStatusKey(match)
  const timerText = getTimerText(match, nowMs)

  return (
    <div
      className={theme.cardClass}
      style={{
        borderRadius: 20,
        padding: 13,
        marginBottom: 10,
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: 16,
          lineHeight: 1.15,
          marginBottom: 8,
        }}
      >
        {getMatchTitle(match)}
      </div>

      <div
        style={{
          fontSize: 12,
          color: '#6b7280',
          marginBottom: 3,
          letterSpacing: 0.2,
        }}
      >
        {sportName}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          {match.match_time || 'Sin horario'}
        </div>

        {timerText ? (
          <div
            className="score-live"
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: '#1d4ed8',
              background: '#dbeafe',
              border: '1px solid #93c5fd',
              padding: '3px 8px',
              borderRadius: 999,
            }}
          >
            ⏳ {timerText}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 8,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ textAlign: 'center', minWidth: 0 }}>
          {teamA?.logo_url ? (
            <img
              src={teamA.logo_url}
              alt={teamA?.name || 'Equipo'}
              style={{
                width: 28,
                height: 28,
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto 6px auto',
              }}
            />
          ) : null}

          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.12,
              wordBreak: 'break-word',
            }}
          >
            {teamA?.name || 'Equipo'}
          </div>
        </div>

        <div
          className={statusKey === 'live' ? 'score-live' : ''}
          style={{
            fontSize: 25,
            fontWeight: 900,
            lineHeight: 1,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            minWidth: 62,
          }}
        >
          {score.a} - {score.b}
        </div>

        <div style={{ textAlign: 'center', minWidth: 0 }}>
          {teamB?.logo_url ? (
            <img
              src={teamB.logo_url}
              alt={teamB?.name || 'Equipo'}
              style={{
                width: 28,
                height: 28,
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto 6px auto',
              }}
            />
          ) : null}

          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.12,
              wordBreak: 'break-word',
            }}
          >
            {teamB?.name || 'Equipo'}
          </div>
        </div>
      </div>

      <div
        className={theme.badgeClass}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 900,
          background: theme.badgeBg,
          color: theme.badgeColor,
          border: `1px solid ${theme.badgeBorder}`,
        }}
      >
        {statusKey === 'live' ? <LiveBall /> : null}
        {getStatusLabel(match)}
      </div>
    </div>
  )
}


function GrandFinalMatchCard({
  match,
  teams,
  sportName,
  nowMs,
  events,
  finalState,
  refereesData,
}: {
  match: MatchRow
  teams: TeamRow[]
  sportName: string
  nowMs: number
  events: MatchEventRow[]
  finalState: FinalStateRow | null
  refereesData: any[]
}) {
  const teamA = match._team_a_display || getTeam(teams, match.team_a_id)
  const teamB = match._team_b_display || getTeam(teams, match.team_b_id)
  const statusKey = getStatusKey(match)
  const isFinished = statusKey === 'finished' || match?.status === 'submitted'
  const publicEvents = getPublicFinalEvents(events, match, finalState)
  const score = getFinalScoreFromEvents(match, publicEvents, finalState)
  const clockInfo = getFinalClockInfo(finalState, nowMs, isFinished, match)

  const orderedEvents = [...publicEvents].sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime()
    const bTime = new Date(b.created_at || 0).getTime()
    return bTime - aTime
  })

  const latestGoal = orderedEvents.find((event) => event.event_type === 'goal' || event.event_type === 'own_goal')
  const showGoalAnimation = Boolean(
    latestGoal?.created_at && nowMs - new Date(latestGoal.created_at).getTime() <= 8000
  )
  const latestGoalTeamName = getGoalDisplayTeamName(latestGoal, teamA, teamB)
  const latestGoalLogo = getGoalDisplayLogo(latestGoal, teamA, teamB)

  const goalsA = orderedEvents.filter(
    (event) =>
      (event.event_type === 'goal' && event.team_side === 'A') ||
      (event.event_type === 'own_goal' && event.team_side === 'B')
  )

  const goalsB = orderedEvents.filter(
    (event) =>
      (event.event_type === 'goal' && event.team_side === 'B') ||
      (event.event_type === 'own_goal' && event.team_side === 'A')
  )

  const cards = orderedEvents.filter(
    (event) => event.event_type === 'yellow_card' || event.event_type === 'red_card'
  )

  const incidents = orderedEvents.filter(
    (event) =>
      event.event_type === 'injury' ||
      event.event_type === 'goal_cancelled' ||
      event.event_type === 'own_goal'
  )

  const winnerName = getWinnerName(match, teamA, teamB, score)
  const referees = getMatchReferees(match, refereesData)
  const teamACoach = getTeamCoach(teamA)
  const teamBCoach = getTeamCoach(teamB)
  const teamAPlayers = getTeamPlayers(teamA)
  const teamBPlayers = getTeamPlayers(teamB)

  return (
    <div className="final-broadcast-wrap">
      {showGoalAnimation ? (
        <div className="goal-broadcast-overlay">
          <div className="goal-broadcast-card">
            <div className="goal-broadcast-small">SHIVTE WORLD CUP 2026</div>
            {latestGoalLogo ? <img src={latestGoalLogo} alt={latestGoalTeamName} className="goal-broadcast-logo" /> : null}
            <div className="goal-broadcast-main">GOOOOOOL</div>
            <div className="goal-broadcast-team">{latestGoalTeamName}</div>
            <div className="goal-broadcast-player">
              {latestGoal?.player || 'Jugador por confirmar'}
            </div>
          </div>
        </div>
      ) : null}

      <div className="final-hero-card final-hero-image-only">
        <img
          src="/gran-final-shivte.png"
          alt="Gran Final Shivte World Cup 2026"
          className="final-hero-image"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement
            target.style.display = 'none'
            const fallback = target.nextElementSibling as HTMLDivElement | null
            if (fallback) fallback.style.display = 'block'
          }}
        />
        <div className="final-hero-fallback" style={{ display: 'none' }}>
          <div className="final-hero-kicker">SHIVTE WORLD CUP 2026</div>
          <div className="final-hero-title">Gran Final</div>
          <div className="final-hero-subtitle">{sportName} · La transmisión oficial del partido más importante.</div>
        </div>
      </div>

      <div className="final-scoreboard">
        <div className="final-scoreboard-glow" />

        <div className="final-scoreboard-top">
          <div>
            <div className="final-scoreboard-kicker">GRAN FINAL · {sportName}</div>
            <div className="final-scoreboard-sub">Transmisión en vivo</div>
          </div>

          <div className={`final-status-pill final-status-${statusKey}`}>
            {statusKey === 'live' ? <LiveBall /> : null}
            {getStatusLabel(match)}
          </div>
        </div>

        <div className="final-score-grid">
          <div className="final-team-block">
            {teamA?.logo_url ? (
              <img src={teamA.logo_url} alt={teamA?.name || 'Equipo A'} className="final-team-logo" />
            ) : null}
            <div className="final-team-name">{teamA?.name || 'Equipo A'}</div>
          </div>

          <div className="final-center-block">
            <div className={statusKey === 'live' ? 'final-score final-score-live' : 'final-score'}>
              {score.a} - {score.b}
            </div>

            <div className="final-clock-row">
              <span className={clockInfo.isAddedTime ? 'final-clock final-clock-added' : 'final-clock'}>
                {clockInfo.clock}
              </span>
              {clockInfo.addedLabel ? <span className="final-added-pill">{clockInfo.addedLabel}</span> : null}
            </div>

            {clockInfo.halftimeClock ? (
              <div className="final-halftime-clock">Descanso: {clockInfo.halftimeClock}</div>
            ) : null}

            <div className="final-stage-label">{clockInfo.stageLabel}</div>
          </div>

          <div className="final-team-block">
            {teamB?.logo_url ? (
              <img src={teamB.logo_url} alt={teamB?.name || 'Equipo B'} className="final-team-logo" />
            ) : null}
            <div className="final-team-name">{teamB?.name || 'Equipo B'}</div>
          </div>
        </div>

        {isFinished ? (
          <div className="final-winner-banner">
            <div className="final-winner-small">🏆 CAMPEÓN SHIVTE WORLD CUP 2026 🏆</div>
            <div className="final-winner-name">{winnerName}</div>
            <div className="final-winner-confetti">★ ★ ★ GRAN FINAL ★ ★ ★</div>
          </div>
        ) : null}
      </div>

      <details className="final-details-dropdown">
        <summary>Ver detalles de la final</summary>

        <div className="final-info-grid">
          <div className="final-panel-box-pro">
            <div className="final-panel-title-pro">Cuerpo arbitral</div>
            {referees.map((referee, index) => (
              <div key={`${referee}-${index}`} className="final-info-line">{referee}</div>
            ))}
          </div>

          <div className="final-panel-box-pro">
            <div className="final-panel-title-pro">Dirección técnica</div>
            <div className="final-info-line">{teamA?.name || 'Equipo A'} · {teamACoach}</div>
            <div className="final-info-line">{teamB?.name || 'Equipo B'} · {teamBCoach}</div>
          </div>
        </div>

        <div className="final-info-grid final-info-grid-players">
          <div className="final-panel-box-pro">
            <div className="final-panel-title-pro">Jugadores {teamA?.name || 'Equipo A'}</div>
            {teamAPlayers.length > 0 ? (
              <div className="final-player-list">
                {teamAPlayers.map((player) => <span key={player}>{player}</span>)}
              </div>
            ) : (
              <div className="final-empty-pro">Plantel pendiente de cargar.</div>
            )}
          </div>

          <div className="final-panel-box-pro">
            <div className="final-panel-title-pro">Jugadores {teamB?.name || 'Equipo B'}</div>
            {teamBPlayers.length > 0 ? (
              <div className="final-player-list">
                {teamBPlayers.map((player) => <span key={player}>{player}</span>)}
              </div>
            ) : (
              <div className="final-empty-pro">Plantel pendiente de cargar.</div>
            )}
          </div>
        </div>
      </details>

      <div className="final-goals-grid">
        <div className="final-panel-box-pro">
          <div className="final-panel-title-pro">Goles {teamA?.name || 'A'}</div>
          {goalsA.length > 0 ? (
            goalsA.map((event) => (
              <div key={event.id} className="final-goal-line">
                <span>{getEventDisplayMinute(event, finalState) || clockInfo.clock}</span>
                <strong>{event.player || 'Jugador'}</strong>
              </div>
            ))
          ) : (
            <div className="final-empty-pro">Sin goles.</div>
          )}
        </div>

        <div className="final-panel-box-pro">
          <div className="final-panel-title-pro">Goles {teamB?.name || 'B'}</div>
          {goalsB.length > 0 ? (
            goalsB.map((event) => (
              <div key={event.id} className="final-goal-line">
                <span>{getEventDisplayMinute(event, finalState) || clockInfo.clock}</span>
                <strong>{event.player || 'Jugador'}</strong>
              </div>
            ))
          ) : (
            <div className="final-empty-pro">Sin goles.</div>
          )}
        </div>
      </div>

      <div className="final-panel-box-pro">
        <div className="final-panel-title-pro">Timeline en vivo</div>

        {orderedEvents.length > 0 ? (
          <div className="final-timeline">
            {orderedEvents.map((event) => {
              const color = getFinalEventColor(event.event_type)
              const teamName =
                event.team_name ||
                (event.team_side === 'A'
                  ? teamA?.name
                  : event.team_side === 'B'
                    ? teamB?.name
                    : 'General')

              return (
                <div key={event.id} className="final-timeline-card" style={{ borderColor: color }}>
                  <div className="final-timeline-icon" style={{ background: color }}>
                    {getFinalEventIcon(event.event_type)}
                  </div>

                  <div>
                    <div className="final-timeline-title">
                      {getEventDisplayMinute(event, finalState) ? `${getEventDisplayMinute(event, finalState)} · ` : ''}{getFinalEventLabel(event.event_type)} · {teamName || 'General'}
                    </div>
                    <div className="final-timeline-meta">
                      {getFinalStageLabel(event.stage)}{event.player ? ` · ${event.player}` : ''}
                    </div>
                    {event.note ? <div className="final-timeline-note">{event.note}</div> : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="final-empty-state-pro">
            La final todavía no tiene eventos públicos. Cuando el árbitro registre goles, tarjetas o incidencias, aparecerán aquí en vivo.
          </div>
        )}
      </div>

      {cards.length > 0 || incidents.length > 0 ? (
        <div className="final-panel-box-pro">
          <div className="final-panel-title-pro">Resumen disciplinario e incidencias</div>
          <div className="final-summary-list">
            {[...cards, ...incidents].slice(0, 10).map((event) => (
              <div key={`summary-${event.id}`} className="final-info-line">
                {getFinalEventIcon(event.event_type)} {getEventDisplayMinute(event, finalState) ? `${getEventDisplayMinute(event, finalState)} · ` : ''}
                {getFinalEventLabel(event.event_type)} · {event.team_name || 'General'}
                {event.player ? ` · ${event.player}` : ''}
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
      id="clasificacion-general"
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 22,
        padding: 16,
        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        marginBottom: 16,
        scrollMarginTop: 20,
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: 24,
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
            <div style={{ width: 18, fontWeight: 900 }}>{i + 1}</div>

            {t.logo_url ? (
              <img
                src={t.logo_url}
                alt={t.team}
                style={{
                  width: 24,
                  height: 24,
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
            ) : null}

            <div
              style={{
                fontWeight: 800,
                wordBreak: 'break-word',
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
            <span style={{ fontWeight: 900 }}>{t.PTS}</span>
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
        borderRadius: 22,
        padding: 16,
        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: 24,
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
            <tr style={{ background: '#111827', color: 'white' }}>
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
                    fontWeight: 900,
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
                        style={{
                          padding: 10,
                          textAlign: 'center',
                          verticalAlign: 'top',
                        }}
                      >
                        —
                      </td>
                    )
                  }

                  const teamA = getTeam(teams, match.team_a_id)
                  const teamB = getTeam(teams, match.team_b_id)
                  const score = getDisplayScores(match)
                  const theme = getStatusTheme(match)
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
                              }}
                            />
                          ) : null}
                          <span>{teamA?.name || 'Equipo'}</span>
                        </div>
                      </div>

                      <div
                        style={{
                          fontWeight: 900,
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
                              }}
                            />
                          ) : null}
                          <span>{teamB?.name || 'Equipo'}</span>
                        </div>
                      </div>

                      <div>
                        <span
                          className={theme.badgeClass}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: theme.badgeBg,
                            color: theme.badgeColor,
                            border: `1px solid ${theme.badgeBorder}`,
                            padding: '2px 6px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 800,
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
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [sports, setSports] = useState<SportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [nowMs, setNowMs] = useState(Date.now())
  const [activeView, setActiveView] = useState<TablaView>('jornadas')
  const [finalEventsByMatch, setFinalEventsByMatch] = useState<Record<string, MatchEventRow[]>>({})
  const [finalStateByMatch, setFinalStateByMatch] = useState<Record<string, FinalStateRow>>({})
  const [refereesData, setRefereesData] = useState<any[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: m } = await supabase.from('matches').select('*')
      const { data: t } = await supabase.from('teams').select('*')
      const { data: s } = await supabase.from('Sports').select('*')
      const { data: refs } = await supabase.from('referees').select('*')
      const { data: ev } = await supabase
        .from('match_events')
        .select('*')
        .order('created_at', { ascending: true })

      const { data: fs } = await supabase
        .from('match_final_state')
        .select('*')

      if (!mounted) return

      const groupedEvents: Record<string, MatchEventRow[]> = {}
      ;(ev || []).forEach((event: any) => {
        const key = String(event.match_id)
        if (!groupedEvents[key]) groupedEvents[key] = []
        groupedEvents[key].push(event)
      })

      const groupedStates: Record<string, FinalStateRow> = {}
      ;(fs || []).forEach((state: any) => {
        groupedStates[String(state.match_id)] = state
      })

      setMatches(m || [])
      setTeams(t || [])
      setSports(s || [])
      setRefereesData(refs || [])
      setFinalEventsByMatch(groupedEvents)
      setFinalStateByMatch(groupedStates)
      setLoading(false)
    }

    load()
    const dataInterval = setInterval(load, 1800)
    const timerInterval = setInterval(() => setNowMs(Date.now()), 1000)

    return () => {
      mounted = false
      clearInterval(dataInterval)
      clearInterval(timerInterval)
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
    const grouped: Record<string, MatchRow[]> = {}

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
        name: t.name,
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
      .filter((m) => m.phase === 'regular' && hasFinalScore(m))
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

  const quarterDisplayMatches = useMemo(() => {
    const top8 = generalStandings.slice(0, 8)

    const pairs = [
      [0, 7],
      [1, 6],
      [2, 5],
      [3, 4],
    ]

    return quarterMatches.map((match, index) => {
      const pair = pairs[index] || [null, null]
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
  }, [quarterMatches, generalStandings])

  const semiDisplayMatches = useMemo(() => {
    const qf1Winner = getWinnerTeam(quarterDisplayMatches[0])
    const qf2Winner = getWinnerTeam(quarterDisplayMatches[1])
    const qf3Winner = getWinnerTeam(quarterDisplayMatches[2])
    const qf4Winner = getWinnerTeam(quarterDisplayMatches[3])

    return semiMatches.map((match, index) => {
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
  }, [semiMatches, quarterDisplayMatches])

  const finalDisplayMatches = useMemo(() => {
    const sf1Winner = getWinnerTeam(semiDisplayMatches[0])
    const sf2Winner = getWinnerTeam(semiDisplayMatches[1])

    return finalMatches.map((match) => ({
      ...match,
      _team_a_display: sf1Winner || makePlaceholderTeam('Ganador SF1'),
      _team_b_display: sf2Winner || makePlaceholderTeam('Ganador SF2'),
    }))
  }, [finalMatches, semiDisplayMatches])

  const regularTimes = useMemo(() => {
    const unique = Array.from(
      new Set(regularMatches.map((m) => m.match_time || 'Sin horario'))
    )
    return unique.sort((a, b) => parseTimeRangeToMinutes(a) - parseTimeRangeToMinutes(b))
  }, [regularMatches])

  const regularRowsByTime = useMemo(() => {
    const rows: Record<string, Record<number, MatchRow>> = {}

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
          50% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }

        @keyframes ballBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-1px) rotate(10deg); }
          50% { transform: translateY(-2px) rotate(20deg); }
          75% { transform: translateY(-1px) rotate(10deg); }
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

        .live-ball { animation: ballBounce 1s ease-in-out infinite; }
        @keyframes goalBroadcastPop { 0% { transform: scale(0.82); opacity: 0; filter: blur(3px); } 18% { transform: scale(1.06); opacity: 1; filter: blur(0); } 55% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.08); opacity: 0; } }
        @keyframes goalBroadcastBg { 0% { opacity: 0; } 16% { opacity: 1; } 72% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes finalScoreGlow { 0% { text-shadow: 0 0 0 rgba(255,255,255,0); } 50% { text-shadow: 0 0 24px rgba(255,255,255,0.42); } 100% { text-shadow: 0 0 0 rgba(255,255,255,0); } }
        .final-broadcast-wrap { width: 100%; position: relative; }
        .goal-broadcast-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(22,163,74,0.38), rgba(2,6,23,0.78)); pointer-events: none; animation: goalBroadcastBg 8s ease-in-out forwards; }
        .goal-broadcast-card { width: min(720px, calc(100vw - 32px)); border-radius: 34px; padding: 36px 24px; text-align: center; color: white; background: linear-gradient(135deg, rgba(2,6,23,0.96), rgba(15,118,110,0.94)); border: 1px solid rgba(255,255,255,0.22); box-shadow: 0 28px 80px rgba(0,0,0,0.45); animation: goalBroadcastPop 8s ease-in-out forwards; }
        .goal-broadcast-small { font-size: 13px; font-weight: 900; letter-spacing: 3px; opacity: 0.82; }
        .goal-broadcast-main { font-size: clamp(48px, 10vw, 108px); line-height: 0.95; font-weight: 1000; letter-spacing: -4px; margin-top: 10px; }
        .goal-broadcast-logo { width: clamp(80px, 16vw, 150px); height: clamp(80px, 16vw, 150px); object-fit: contain; margin: 18px auto 0; display: block; filter: drop-shadow(0 14px 24px rgba(0,0,0,0.38)); animation: goalLogoPulse 1.1s ease-in-out infinite; }
        .goal-broadcast-team { margin-top: 8px; font-size: clamp(22px, 5vw, 44px); font-weight: 1000; letter-spacing: 1px; }
        .goal-broadcast-player { margin-top: 8px; font-size: clamp(18px, 4vw, 34px); font-weight: 900; opacity: 0.92; }
        .final-hero-card { position: relative; border-radius: 28px; overflow: hidden; margin-bottom: 16px; background: linear-gradient(135deg, #111827 0%, #1f2937 52%, #0f766e 100%); color: white; box-shadow: 0 18px 36px rgba(0,0,0,0.18); min-height: 148px; }
        .final-hero-image { width: 100%; height: auto; min-height: 148px; object-fit: cover; display: block; }
        .final-hero-fallback { padding: 22px; }
        .final-hero-kicker { font-size: 13px; font-weight: 900; letter-spacing: 3px; opacity: 0.86; }
        .final-hero-title { font-size: clamp(36px, 7vw, 70px); font-weight: 1000; line-height: 0.96; margin-top: 8px; }
        .final-hero-subtitle { margin-top: 10px; font-size: 15px; opacity: 0.88; font-weight: 700; }
        .final-scoreboard { position: relative; overflow: hidden; border-radius: 34px; padding: 22px; margin-bottom: 16px; color: white; background: linear-gradient(135deg, #020617 0%, #111827 44%, #0f766e 100%); border: 1px solid rgba(255,255,255,0.16); box-shadow: 0 22px 50px rgba(0,0,0,0.28); }
        .final-scoreboard-glow { position: absolute; inset: 0; background: radial-gradient(circle at 20% 8%, rgba(255,255,255,0.16), transparent 26%), radial-gradient(circle at 84% 16%, rgba(34,197,94,0.28), transparent 28%); pointer-events: none; }
        .final-scoreboard-top, .final-score-grid, .final-winner-banner { position: relative; }
        .final-scoreboard-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px; }
        .final-scoreboard-kicker { font-size: 13px; font-weight: 900; letter-spacing: 3px; opacity: 0.9; }
        .final-scoreboard-sub { font-size: 13px; font-weight: 800; opacity: 0.72; margin-top: 4px; }
        .final-status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 8px 12px; font-size: 12px; font-weight: 1000; white-space: nowrap; border: 1px solid rgba(255,255,255,0.28); }
        .final-status-live { background: #dbeafe; color: #1d4ed8; } .final-status-finished { background: #dcfce7; color: #166534; } .final-status-pending { background: #fef3c7; color: #92400e; }
        .final-score-grid { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 18px; }
        .final-team-block { text-align: center; min-width: 0; }
        .final-team-logo { width: clamp(58px, 10vw, 108px); height: clamp(58px, 10vw, 108px); object-fit: contain; display: block; margin: 0 auto 10px; filter: drop-shadow(0 12px 16px rgba(0,0,0,0.35)); }
        .final-team-name { font-size: clamp(20px, 3vw, 34px); font-weight: 1000; line-height: 1.02; word-break: break-word; }
        .final-team-coach { margin-top: 7px; font-size: 12px; opacity: 0.76; font-weight: 800; }
        .final-center-block { min-width: 170px; text-align: center; }
        .final-score { font-size: clamp(58px, 11vw, 128px); font-weight: 1000; line-height: 0.9; letter-spacing: -6px; white-space: nowrap; }
        .final-score-live { animation: finalScoreGlow 2s ease-in-out infinite; }
        .final-clock-row { display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; padding: 8px 13px; border-radius: 999px; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.18); box-shadow: inset 0 0 18px rgba(255,255,255,0.05); }
        .final-clock { font-size: clamp(18px, 3vw, 30px); font-weight: 1000; line-height: 1; }
        .final-clock-added { color: #fde68a; }
        .final-added-pill { background: #facc15; color: #111827; font-size: clamp(13px, 2vw, 20px); font-weight: 1000; padding: 4px 8px; border-radius: 999px; }
        .final-halftime-clock { margin-top: 8px; font-size: 14px; font-weight: 900; color: #fde68a; }
        .final-stage-label { margin-top: 9px; font-size: 14px; font-weight: 1000; opacity: 0.88; }
        .final-winner-banner { margin-top: 18px; border-radius: 22px; padding: 18px; text-align: center; background: linear-gradient(135deg, #facc15, #f59e0b); color: #111827; box-shadow: 0 14px 26px rgba(245,158,11,0.24); }
        .final-winner-small { font-size: 13px; font-weight: 1000; letter-spacing: 3px; }
        .final-winner-name { margin-top: 4px; font-size: clamp(28px, 6vw, 56px); font-weight: 1000; line-height: 1; }
        .final-winner-confetti { margin-top: 10px; font-size: 13px; font-weight: 1000; letter-spacing: 3px; opacity: 0.82; }
        .final-info-grid, .final-goals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        .final-details-dropdown { margin-bottom: 14px; border-radius: 24px; border: 1px solid #e5e7eb; background: rgba(255,255,255,0.92); box-shadow: 0 10px 24px rgba(15,23,42,0.08); overflow: hidden; }
        .final-details-dropdown > summary { cursor: pointer; padding: 18px 20px; font-weight: 1000; font-size: 18px; list-style: none; }
        .final-details-dropdown > summary::-webkit-details-marker { display: none; }
        .final-details-dropdown > summary::after { content: '▾'; float: right; opacity: 0.72; }
        .final-details-dropdown[open] > summary { border-bottom: 1px solid #e5e7eb; }
        .final-details-dropdown[open] > summary::after { content: '▴'; }
        .final-details-dropdown .final-info-grid { padding: 14px; margin-bottom: 0; }
        .final-panel-box-pro { background: rgba(255,255,255,0.96); border: 1px solid #e5e7eb; border-radius: 24px; padding: 16px; box-shadow: 0 10px 26px rgba(15,23,42,0.07); }
        .final-panel-title-pro { font-size: 18px; font-weight: 1000; margin-bottom: 12px; color: #111827; }
        .final-info-line, .final-goal-line { display: flex; justify-content: space-between; gap: 10px; font-size: 14px; font-weight: 800; color: #111827; line-height: 1.35; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
        .final-info-line:last-child, .final-goal-line:last-child { border-bottom: none; }
        .final-player-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .final-player-list span { padding: 7px 10px; border-radius: 999px; background: #f1f5f9; color: #111827; font-size: 12px; font-weight: 900; }
        .final-empty-pro, .final-empty-state-pro { color: #64748b; font-size: 13px; font-weight: 800; line-height: 1.35; }
        .final-empty-state-pro { padding: 16px; border-radius: 18px; border: 1px dashed #cbd5e1; background: #f8fafc; }
        .final-timeline { display: grid; gap: 10px; }
        .final-timeline-card { display: grid; grid-template-columns: auto 1fr; gap: 12px; padding: 12px; border-radius: 18px; background: #f8fafc; border: 1px solid #e5e7eb; }
        .final-timeline-icon { width: 38px; height: 38px; border-radius: 999px; display: flex; align-items: center; justify-content: center; color: white; font-size: 17px; font-weight: 1000; }
        .final-timeline-title { font-size: 14px; font-weight: 1000; color: #111827; line-height: 1.25; }
        .final-timeline-meta, .final-timeline-note { font-size: 12px; color: #64748b; font-weight: 800; margin-top: 3px; line-height: 1.35; }
        @keyframes goalLogoPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @media (max-width: 720px) { .final-scoreboard { padding: 14px; border-radius: 28px; } .final-scoreboard-top { align-items: flex-start; } .final-scoreboard-kicker { font-size: 11px; letter-spacing: 2px; } .final-score-grid { gap: 8px; grid-template-columns: minmax(0, 1fr) minmax(108px, auto) minmax(0, 1fr); } .final-center-block { min-width: 108px; } .final-score { letter-spacing: -3px; font-size: clamp(48px, 17vw, 70px); } .final-team-name { font-size: clamp(17px, 6vw, 24px); } .final-team-logo { width: 58px; height: 58px; } .final-clock-row { padding: 7px 10px; gap: 6px; } .final-info-grid, .final-goals-grid { grid-template-columns: 1fr; } .final-info-grid-players { display: grid; } .final-panel-box-pro { padding: 14px; } }
        @media (min-width: 900px) { .final-broadcast-wrap { max-width: 1080px; margin: 0 auto; } }

      `}</style>

      <main
        style={{
          padding: 14,
          maxWidth: activeView === 'final' ? 1120 : 430,
          margin: '0 auto',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            marginBottom: 18,
            boxShadow: '0 14px 30px rgba(0,0,0,0.18)',
            background: '#111827',
            color: 'white',
          }}
        >
          <img
            src="/header-tabla-shivte.png"
            alt="Resultados Calendario Clasificación"
            style={{
              width: '100%',
              height: 118,
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.innerHTML = '<div style="padding:24px;font-size:28px;font-weight:bold">Tabla</div>'
              }
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveView('jornadas')}
            style={activeView === 'jornadas' ? pillActive : pillWhite}
          >
            Jornadas
          </button>

          <button
            type="button"
            onClick={() => setActiveView('clasificacion')}
            style={activeView === 'clasificacion' ? pillActive : pillWhite}
          >
            Clasificación
          </button>

          <button
            type="button"
            onClick={() => setActiveView('eliminatorias')}
            style={activeView === 'eliminatorias' ? pillActive : pillWhite}
          >
            Eliminatorias
          </button>

          <a href="/" style={pillBlack}>← Inicio</a>
        </div>

        {activeView === 'jornadas' && (
          <>
            <section style={{ marginBottom: 28 }}>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 22,
                  padding: 16,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 24,
                    marginBottom: 6,
                  }}
                >
                  Jornadas
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.35 }}>
                  Resultados y partidos de fase regular.
                </div>
              </div>

              {Object.entries(matchesByJornada).map(([jornada, jornadaMatches]) => (
                <div key={jornada} style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 20,
                      marginBottom: 10,
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
                      nowMs={nowMs}
                    />
                  ))}
                </div>
              ))}
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
          </>
        )}

        {activeView === 'clasificacion' && (
          <section style={{ marginBottom: 28 }}>
            <CompactStandingsCard
              title="Clasificación Shivte WC 26"
              rows={generalStandings}
            />
          </section>
        )}

        {activeView === 'eliminatorias' && (
          <section style={{ marginBottom: 28 }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 22,
                padding: 16,
                boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 24,
                  marginBottom: 6,
                }}
              >
                Eliminatorias
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.35 }}>
                Cuartos de final y semifinal. La Gran Final está separada para darle más importancia.
              </div>
            </div>

            {quarterDisplayMatches.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10 }}>
                  Cuartos de final
                </div>
                {quarterDisplayMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    teams={teams}
                    sportName={sportsMap[match.sport_id] || 'Deporte'}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            )}

            {semiDisplayMatches.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10 }}>
                  Semifinal
                </div>
                {semiDisplayMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    teams={teams}
                    sportName={sportsMap[match.sport_id] || 'Deporte'}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveView('final')}
              style={grandFinalButton}
            >
              Ir a la Gran Final
            </button>
          </section>
        )}

        {activeView === 'final' && (
          <section style={{ marginBottom: 28 }}>
            <button
              type="button"
              onClick={() => setActiveView('eliminatorias')}
              style={{ ...pillBlack, marginBottom: 14 }}
            >
              ← Volver a eliminatorias
            </button>

            {finalDisplayMatches.length > 0 ? (
              finalDisplayMatches.map((match) => (
                <GrandFinalMatchCard
                  key={match.id}
                  match={match}
                  teams={teams}
                  sportName={sportsMap[match.sport_id] || 'Deporte'}
                  nowMs={nowMs}
                  events={finalEventsByMatch[String(match.id)] || []}
                  finalState={finalStateByMatch[String(match.id)] || null}
                  refereesData={refereesData}
                />
              ))
            ) : (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 22,
                  padding: 16,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                  color: '#6b7280',
                  fontWeight: 800,
                }}
              >
                La Gran Final todavía no está configurada.
              </div>
            )}
          </section>
        )}
      </main>
    </>
  )
}


const finalSummaryBox = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 20,
  padding: 13,
  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
} as const

const finalSummaryTitle = {
  fontSize: 12,
  color: '#6b7280',
  fontWeight: 900,
  marginBottom: 8,
  lineHeight: 1.2,
} as const

const finalMiniLine = {
  fontSize: 13,
  fontWeight: 800,
  color: '#111827',
  lineHeight: 1.35,
} as const

const finalEmptyText = {
  fontSize: 12,
  color: '#9ca3af',
  fontWeight: 800,
} as const

const finalPanelBox = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 22,
  padding: 16,
  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
  marginBottom: 14,
} as const

const finalPanelTitle = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 12,
} as const

const finalEmptyState = {
  padding: 14,
  borderRadius: 16,
  background: '#f9fafb',
  border: '1px dashed #d1d5db',
  color: '#6b7280',
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.35,
} as const

const pillBlack = {
  display: 'inline-block',
  padding: '8px 14px',
  background: '#111827',
  color: 'white',
  borderRadius: 999,
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: 14,
} as const

const pillGreen = {
  display: 'inline-block',
  padding: '8px 14px',
  background: '#0f766e',
  color: 'white',
  borderRadius: 999,
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: 14,
} as const
const pillWhite = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 12px',
  background: '#ffffff',
  color: '#111827',
  borderRadius: 999,
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: 14,
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  cursor: 'pointer',
} as const

const pillActive = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 12px',
  background: '#0f766e',
  color: 'white',
  borderRadius: 999,
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: 14,
  border: '1px solid #0f766e',
  boxShadow: '0 6px 16px rgba(15,118,110,0.25)',
  cursor: 'pointer',
} as const

const grandFinalButton = {
  width: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '14px 16px',
  background: 'linear-gradient(135deg, #111827 0%, #0f766e 100%)',
  color: 'white',
  borderRadius: 18,
  textDecoration: 'none',
  fontWeight: 900,
  fontSize: 16,
  border: '1px solid rgba(255,255,255,0.18)',
  boxShadow: '0 10px 22px rgba(0,0,0,0.18)',
  cursor: 'pointer',
} as const
