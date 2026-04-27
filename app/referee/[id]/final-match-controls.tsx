'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Stage = 'first_half' | 'halftime' | 'second_half' | 'extra_time' | 'penalties'

type EventType =
  | 'goal'
  | 'yellow_card'
  | 'red_card'
  | 'own_goal'
  | 'goal_cancelled'
  | 'injury'
  | 'pause'
  | 'note'

type FinalEvent = {
  id: string
  stage: Stage
  minute: number
  team: 'A' | 'B' | 'neutral'
  player: string
  type: EventType
  note?: string
}

type QuickAction = EventType | null

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const secs = safe % 60
  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`
}

function getStageLabel(stage: Stage) {
  if (stage === 'first_half') return '1er tiempo'
  if (stage === 'halftime') return 'Medio tiempo'
  if (stage === 'second_half') return '2do tiempo'
  if (stage === 'extra_time') return 'Tiempo extra'
  if (stage === 'penalties') return 'Penales'
  return stage
}

function getEventLabel(type: EventType) {
  if (type === 'goal') return 'Gol'
  if (type === 'yellow_card') return 'Amarilla'
  if (type === 'red_card') return 'Roja'
  if (type === 'own_goal') return 'Autogol'
  if (type === 'goal_cancelled') return 'Gol anulado'
  if (type === 'injury') return 'Lesión'
  if (type === 'pause') return 'Tiempo agregado'
  if (type === 'note') return 'Nota'
  return type
}

function getEventColor(type: EventType) {
  if (type === 'goal') return '#16a34a'
  if (type === 'yellow_card') return '#f59e0b'
  if (type === 'red_card') return '#dc2626'
  if (type === 'own_goal') return '#9333ea'
  if (type === 'goal_cancelled') return '#6b7280'
  if (type === 'injury') return '#ea580c'
  if (type === 'pause') return '#111827'
  return '#374151'
}


function mapDbEventToFinalEvent(row: any): FinalEvent {
  return {
    id: row.id,
    stage: row.stage || 'first_half',
    minute: Number(row.minute ?? 0),
    team: row.team_side || 'neutral',
    player: row.player || 'General',
    type: row.event_type,
    note: row.note || undefined,
  }
}

export default function FinalMatchControls({
  matchId,
  teamAName,
  teamBName,
  initialLiveScoreA,
  initialLiveScoreB,
  initialNote,
  initialStartedAt,
  teamAId,
  teamBId,
  teamAPlayers = [],
  teamBPlayers = [],
}: {
  matchId: string
  teamAName: string
  teamBName: string
  initialLiveScoreA: number | null
  initialLiveScoreB: number | null
  initialNote?: string | null
  initialStartedAt?: string | null
  teamAId?: number | null
  teamBId?: number | null
  teamAPlayers?: string[]
  teamBPlayers?: string[]
}) {
  const router = useRouter()

  const [scoreA, setScoreA] = useState(initialLiveScoreA ?? 0)
  const [scoreB, setScoreB] = useState(initialLiveScoreB ?? 0)

  const [penaltyA, setPenaltyA] = useState(0)
  const [penaltyB, setPenaltyB] = useState(0)

  const [note, setNote] = useState(initialNote ?? '')
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt ?? null)
  const [stageStartedAt, setStageStartedAt] = useState<string | null>(
    initialStartedAt ?? null
  )

  const [stage, setStage] = useState<Stage>('first_half')
  const [winnerTeamId, setWinnerTeamId] = useState<number | null>(null)

  const [events, setEvents] = useState<FinalEvent[]>([])

  const [quickAction, setQuickAction] = useState<QuickAction>(null)
  const [eventTeam, setEventTeam] = useState<'A' | 'B' | 'neutral'>('A')
  const [eventPlayer, setEventPlayer] = useState('')
  const [eventNote, setEventNote] = useState('')

  const [addedSeconds, setAddedSeconds] = useState(0)
  const [pauseStartedAt, setPauseStartedAt] = useState<string | null>(null)
  const [pauseReason, setPauseReason] = useState('')

  const [loading, setLoading] = useState(false)
  const [savingScore, setSavingScore] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  const noteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const firstRenderRef = useRef(true)

  const firstHalfMinutes = 10
  const secondHalfMinutes = 10
  const extraTimeMinutes = 5

  const durationMinutes =
    stage === 'first_half'
      ? firstHalfMinutes
      : stage === 'second_half'
        ? secondHalfMinutes
        : stage === 'extra_time'
          ? extraTimeMinutes
          : 0

  const timerActive =
    Boolean(stageStartedAt) &&
    stage !== 'halftime' &&
    stage !== 'penalties'

  const pauseActive = Boolean(pauseStartedAt)

  useEffect(() => {
    if (!timerActive && !pauseActive) return

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [timerActive, pauseActive])


  useEffect(() => {
    let mounted = true

    async function loadEvents() {
      try {
        const res = await fetch(`/api/match-event?matchId=${encodeURIComponent(matchId)}`)
        const result = await res.json()

        if (!mounted || !res.ok) return

        setEvents((result.events || []).map(mapDbEventToFinalEvent).reverse())
      } catch {
        // No bloquea el control del árbitro si falla la carga del historial.
      }
    }

    loadEvents()
  }, [matchId])

  const pauseSeconds = useMemo(() => {
    if (!pauseStartedAt) return 0
    return Math.max(
      0,
      Math.floor((now - new Date(pauseStartedAt).getTime()) / 1000)
    )
  }, [pauseStartedAt, now])

  const totalAddedSeconds = addedSeconds + pauseSeconds

  const remainingSeconds = useMemo(() => {
    if (!stageStartedAt || !durationMinutes) return durationMinutes * 60

    const startMs = new Date(stageStartedAt).getTime()
    const normalEndMs = startMs + durationMinutes * 60 * 1000
    const adjustedEndMs = normalEndMs + totalAddedSeconds * 1000

    return Math.ceil((adjustedEndMs - now) / 1000)
  }, [stageStartedAt, now, durationMinutes, totalAddedSeconds])

  const isTie = scoreA === scoreB
  const isTimeFinished = timerActive && remainingSeconds <= 0
  const isLastMinute = timerActive && remainingSeconds <= 60 && remainingSeconds > 0

  const availablePlayers =
    eventTeam === 'A'
      ? teamAPlayers
      : eventTeam === 'B'
        ? teamBPlayers
        : []

  async function startMatch() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/match-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo iniciar el partido')
        setLoading(false)
        return
      }

      setStartedAt(result.started_at)
      setStageStartedAt(result.started_at)
      setStage('first_half')
      setNow(Date.now())
      setLoading(false)
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar el partido')
      setLoading(false)
    }
  }

  async function updateScore(nextA: number, nextB: number) {
    if (!startedAt) {
      setError('Debes iniciar la final antes de mover el marcador')
      return false
    }

    setSavingScore(true)
    setError('')

    try {
      const res = await fetch('/api/match-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          scoreA: nextA,
          scoreB: nextB,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo actualizar el marcador')
        setSavingScore(false)
        return false
      }

      setScoreA(result.live_score_a)
      setScoreB(result.live_score_b)
      setSavingScore(false)
      return true
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el marcador')
      setSavingScore(false)
      return false
    }
  }

  async function saveNote(value: string) {
    setSavingNote(true)
    setError('')

    try {
      const res = await fetch('/api/match-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          refereeNote: value,
        }),
      })

      if (!res.ok) {
        const result = await res.json()
        setError(result.error || 'No se pudo guardar la nota')
      }

      setSavingNote(false)
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar la nota')
      setSavingNote(false)
    }
  }

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }

    if (noteTimeoutRef.current) {
      clearTimeout(noteTimeoutRef.current)
    }

    noteTimeoutRef.current = setTimeout(() => {
      saveNote(note)
    }, 700)

    return () => {
      if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current)
    }
  }, [note])

  function getCurrentMinute() {
    if (!stageStartedAt) return 0

    const startMs = new Date(stageStartedAt).getTime()
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000))
    const baseSeconds = getStageBaseSeconds(stage)
    const totalSeconds = baseSeconds + elapsedSeconds

    return Math.floor(totalSeconds / 60)
  }

  function openQuickAction(type: EventType) {
    setQuickAction(type)
    setEventTeam(type === 'note' || type === 'pause' ? 'neutral' : 'A')
    setEventPlayer('')
    setEventNote('')
    setError('')
  }

  function closeQuickAction() {
    setQuickAction(null)
    setEventPlayer('')
    setEventNote('')
    setError('')
  }

  async function saveFinalEvent(event: FinalEvent, scoreSnapshotA = scoreA, scoreSnapshotB = scoreB) {
    const teamId =
      event.team === 'A'
        ? teamAId ?? null
        : event.team === 'B'
          ? teamBId ?? null
          : null

    const teamName =
      event.team === 'A'
        ? teamAName
        : event.team === 'B'
          ? teamBName
          : 'General'

    const res = await fetch('/api/match-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId,
        eventType: event.type,
        stage: event.stage,
        minute: event.minute,
        teamSide: event.team,
        teamId,
        teamName,
        player: event.player,
        note: event.note || null,
        scoreA: scoreSnapshotA,
        scoreB: scoreSnapshotB,
        penaltyA,
        penaltyB,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      throw new Error(result.error || 'No se pudo guardar el evento')
    }

    return mapDbEventToFinalEvent(result.event)
  }

  async function addEventFromQuickAction() {
    setError('')

    if (!quickAction) return

    const player = eventPlayer.trim()
    const noteText = eventNote.trim()

    if (
      quickAction !== 'note' &&
      quickAction !== 'pause' &&
      eventTeam !== 'neutral' &&
      !player
    ) {
      setError('Selecciona o escribe el jugador')
      return
    }

    let nextScoreA = scoreA
    let nextScoreB = scoreB

    if (quickAction === 'goal') {
      nextScoreA = eventTeam === 'A' ? scoreA + 1 : scoreA
      nextScoreB = eventTeam === 'B' ? scoreB + 1 : scoreB

      const ok = await updateScore(nextScoreA, nextScoreB)
      if (!ok) return
    }

    if (quickAction === 'own_goal') {
      nextScoreA = eventTeam === 'B' ? scoreA + 1 : scoreA
      nextScoreB = eventTeam === 'A' ? scoreB + 1 : scoreB

      const ok = await updateScore(nextScoreA, nextScoreB)
      if (!ok) return
    }

    if (quickAction === 'goal_cancelled') {
      nextScoreA = eventTeam === 'A' ? Math.max(0, scoreA - 1) : scoreA
      nextScoreB = eventTeam === 'B' ? Math.max(0, scoreB - 1) : scoreB

      const ok = await updateScore(nextScoreA, nextScoreB)
      if (!ok) return
    }

    const newEvent: FinalEvent = {
      id: crypto.randomUUID(),
      stage,
      minute: getCurrentMinute(),
      team: eventTeam,
      player: player || 'General',
      type: quickAction,
      note: noteText || undefined,
    }

    try {
      const savedEvent = await saveFinalEvent(newEvent, nextScoreA, nextScoreB)

      if (quickAction === 'goal' || quickAction === 'own_goal') {
        await saveFinalState({ lastGoalEventId: savedEvent.id })
      }

      setEvents((current) => [savedEvent, ...current])
      router.refresh()
      closeQuickAction()
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el evento')
    }
  }

  async function removeEvent(id: string) {
    setError('')

    try {
      const res = await fetch('/api/match-event', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, eventId: id }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo borrar el evento')
        return
      }

      setEvents((current) => current.filter((event) => event.id !== id))
    } catch (err: any) {
      setError(err?.message || 'No se pudo borrar el evento')
    }
  }

  function startPause(reason: string) {
    if (!startedAt || stage === 'halftime' || stage === 'penalties') {
      setError('Solo puedes agregar tiempo durante un tiempo activo')
      return
    }

    setPauseReason(reason)
    setPauseStartedAt(new Date().toISOString())
    setError('')
  }

  async function endPause() {
    if (!pauseStartedAt) return

    const seconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(pauseStartedAt).getTime()) / 1000)
    )

    const reason = pauseReason || 'Pausa'
    const readable = formatTime(seconds)

    setAddedSeconds((current) => current + seconds)

    const newEvent: FinalEvent = {
      id: crypto.randomUUID(),
      stage,
      minute: getCurrentMinute(),
      team: 'neutral',
      player: 'General',
      type: 'pause',
      note: `${reason} · +${readable}`,
    }

    try {
      const savedEvent = await saveFinalEvent(newEvent)
      setEvents((current) => [savedEvent, ...current])
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el tiempo agregado')
    }

    setPauseStartedAt(null)
    setPauseReason('')
    setError('')
  }

  async function addManualAddedMinute() {
    setAddedSeconds((current) => current + 60)

    const newEvent: FinalEvent = {
      id: crypto.randomUUID(),
      stage,
      minute: getCurrentMinute(),
      team: 'neutral',
      player: 'General',
      type: 'pause',
      note: 'Tiempo agregado manual · +01:00',
    }

    try {
      const savedEvent = await saveFinalEvent(newEvent)
      setEvents((current) => [savedEvent, ...current])
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el tiempo agregado')
    }
  }

  function removeManualAddedMinute() {
    setAddedSeconds((current) => Math.max(0, current - 60))
  }

  function finishFirstHalf() {
    if (pauseStartedAt) endPause()
    setStage('halftime')
    setStageStartedAt(null)
    setAddedSeconds(0)
    setError('')
  }

  function startSecondHalf() {
    const nowIso = new Date().toISOString()
    setStage('second_half')
    setStageStartedAt(nowIso)
    setAddedSeconds(0)
    setPauseStartedAt(null)
    setPauseReason('')
    setNow(Date.now())
    setError('')
  }

  function goToExtraTime() {
    const nowIso = new Date().toISOString()
    setStage('extra_time')
    setStageStartedAt(nowIso)
    setAddedSeconds(0)
    setPauseStartedAt(null)
    setPauseReason('')
    setWinnerTeamId(null)
    setNow(Date.now())
    setError('')
  }

  function goToPenalties() {
    if (pauseStartedAt) endPause()
    setStage('penalties')
    setStageStartedAt(null)
    setAddedSeconds(0)
    setPauseStartedAt(null)
    setPauseReason('')
    setWinnerTeamId(null)
    setError('')
  }

  function getResolution() {
    if (stage === 'extra_time') return 'extra_time'
    if (stage === 'penalties') return 'penalties'
    return 'regular'
  }

  function getPenaltyWinnerId() {
    if (penaltyA > penaltyB) return teamAId ?? null
    if (penaltyB > penaltyA) return teamBId ?? null
    return winnerTeamId
  }

  function buildEventsText() {
    if (events.length === 0) return ''

    const ordered = [...events].reverse()

    return [
      'EVENTOS DE FINAL:',
      ...ordered.map((event) => {
        const teamName =
          event.team === 'A'
            ? teamAName
            : event.team === 'B'
              ? teamBName
              : 'General'

        const notePart = event.note ? ` — ${event.note}` : ''
        const minutePart = event.minute !== null && event.minute !== undefined ? `${event.minute}' ` : ''

        return `${minutePart}${getStageLabel(event.stage)} | ${teamName} | ${getEventLabel(
          event.type
        )}: ${event.player}${notePart}`
      }),
    ].join('\n')
  }

  async function finishMatch(e?: React.FormEvent) {
    e?.preventDefault()

    setError('')

    if (!startedAt) {
      setError('Debes iniciar la final antes de guardar el resultado')
      return
    }

    if (pauseStartedAt) {
      setError('Primero termina la pausa de tiempo agregado')
      return
    }

    if (stage === 'first_half') {
      setError('Primero debes finalizar el 1er tiempo')
      return
    }

    if (stage === 'halftime') {
      setError('Primero debes iniciar el 2do tiempo')
      return
    }

    if (stage === 'second_half' && isTie) {
      setError('La final está empatada. Debes ir a tiempo extra.')
      return
    }

    if (stage === 'extra_time' && isTie) {
      setError('La final sigue empatada. Debes ir a penales.')
      return
    }

    let finalWinnerTeamId =
      scoreA > scoreB
        ? teamAId ?? null
        : scoreB > scoreA
          ? teamBId ?? null
          : null

    if (stage === 'penalties') {
      finalWinnerTeamId = getPenaltyWinnerId()

      if (penaltyA === penaltyB && !winnerTeamId) {
        setError('En penales debe haber ganador. Sube el marcador o selecciona ganador.')
        return
      }
    }

    if (!finalWinnerTeamId) {
      setError('No se pudo definir ganador. Revisa que los equipos estén cargados.')
      return
    }

    const penaltyText =
      stage === 'penalties'
        ? `Penales: ${teamAName} ${penaltyA} - ${penaltyB} ${teamBName}`
        : ''

    const eventsText = buildEventsText()
    const finalNote = [note, eventsText, penaltyText].filter(Boolean).join('\n\n')

    setLoading(true)

    try {
      const res = await fetch('/api/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          refereeNote: finalNote,
          winnerTeamId: finalWinnerTeamId,
          resolution: getResolution(),
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo finalizar la final')
        setLoading(false)
        return
      }

      await saveFinalState({
        isFinished: true,
        winnerTeamId: finalWinnerTeamId,
        pauseStartedAt: null,
        pauseReason: '',
      })

      router.push('/referee')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo finalizar la final')
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 20, maxWidth: 760 }}>
      <div
        style={{
          marginBottom: 14,
          padding: 14,
          borderRadius: 16,
          background: '#111827',
          color: 'white',
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.8 }}>FINAL · Control especial</div>
        <div style={{ fontSize: 24, fontWeight: 'bold' }}>
          {getStageLabel(stage)}
        </div>
        <div style={{ marginTop: 4, fontSize: 13 }}>
          Status: {startedAt ? 'EN JUEGO' : 'PENDIENTE'}
        </div>
      </div>

      {!startedAt ? (
        <button
          onClick={startMatch}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px 18px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 20,
            fontWeight: 'bold',
            fontSize: 22,
          }}
        >
          {loading ? 'Iniciando...' : 'INICIAR FINAL'}
        </button>
      ) : stage !== 'halftime' && stage !== 'penalties' ? (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 16,
            background: isLastMinute || isTimeFinished ? '#ffe8e8' : '#f4f4f4',
            border: isLastMinute || isTimeFinished ? '2px solid #dc2626' : '1px solid #ddd',
          }}
        >
          <div style={{ fontSize: 13, color: '#666' }}>
            Tiempo restante · {getStageLabel(stage)}
          </div>

          <div
            style={{
              fontSize: 42,
              fontWeight: 'bold',
              lineHeight: 1.1,
              color: isLastMinute || isTimeFinished ? '#b91c1c' : 'black',
            }}
          >
            {formatTime(remainingSeconds)}
          </div>

          <div style={{ marginTop: 8, fontWeight: 'bold', color: '#111827' }}>
            Agregado: +{formatTime(totalAddedSeconds)}
          </div>

          {pauseStartedAt && (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                borderRadius: 12,
                background: '#111827',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              Pausa activa: {pauseReason || 'Pausa'} · +{formatTime(pauseSeconds)}
            </div>
          )}

          {isLastMinute && (
            <div style={{ color: '#b91c1c', marginTop: 8, fontWeight: 'bold' }}>
              ÚLTIMO MINUTO
            </div>
          )}

          {isTimeFinished && (
            <div style={{ color: '#c00', marginTop: 8, fontWeight: 'bold' }}>
              Tiempo terminado
            </div>
          )}
        </div>
      ) : stage === 'halftime' ? (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 16,
            background: '#fffbeb',
            border: '1px solid #facc15',
            fontWeight: 'bold',
          }}
        >
          Medio tiempo
        </div>
      ) : (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 16,
            background: '#f5f3ff',
            border: '1px solid #c4b5fd',
            fontWeight: 'bold',
          }}
        >
          Penales activos
        </div>
      )}

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 16,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ textAlign: 'center', borderRadius: 16, padding: 8 }}>
            <div style={{ fontWeight: 'bold', fontSize: 24 }}>{teamAName}</div>
            <div style={{ fontSize: 48, fontWeight: 'bold', lineHeight: 1.1 }}>
              {scoreA}
            </div>
          </div>

          <div style={{ fontSize: 30, fontWeight: 'bold' }}>VS</div>

          <div style={{ textAlign: 'center', borderRadius: 16, padding: 8 }}>
            <div style={{ fontWeight: 'bold', fontSize: 24 }}>{teamBName}</div>
            <div style={{ fontSize: 48, fontWeight: 'bold', lineHeight: 1.1 }}>
              {scoreB}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 12,
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            fontSize: 13,
            color: '#555',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          Para subir el marcador usa el botón rápido “Gol”. Para corregir, usa “Gol anulado”.
        </div>
      </div>

      <div
        style={{
          marginBottom: 20,
          padding: 16,
          borderRadius: 16,
          border: '1px solid #ddd',
          background: '#fff',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 12 }}>
          Eventos rápidos
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="button" onClick={() => openQuickAction('goal')} style={quickButton('#16a34a')}>
            Gol
          </button>

          <button type="button" onClick={() => openQuickAction('yellow_card')} style={quickButton('#f59e0b')}>
            Amarilla
          </button>

          <button type="button" onClick={() => openQuickAction('red_card')} style={quickButton('#dc2626')}>
            Roja
          </button>

          <button type="button" onClick={() => openQuickAction('injury')} style={quickButton('#ea580c')}>
            Lesión
          </button>

          <button type="button" onClick={() => openQuickAction('goal_cancelled')} style={quickButton('#6b7280')}>
            Gol anulado
          </button>

          <button type="button" onClick={() => openQuickAction('own_goal')} style={quickButton('#9333ea')}>
            Autogol
          </button>

          <button type="button" onClick={() => openQuickAction('note')} style={quickButton('#111827')}>
            Nota
          </button>
        </div>

        {quickAction && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 14,
              background: '#f9fafb',
              border: `2px solid ${getEventColor(quickAction)}`,
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 10 }}>
              {getEventLabel(quickAction)}
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {quickAction !== 'note' && (
                <select
                  value={eventTeam}
                  onChange={(e) => {
                    setEventTeam(e.target.value as 'A' | 'B' | 'neutral')
                    setEventPlayer('')
                  }}
                  style={inputStyle}
                >
                  <option value="A">{teamAName}</option>
                  <option value="B">{teamBName}</option>
                  <option value="neutral">General</option>
                </select>
              )}

              {quickAction !== 'note' && eventTeam !== 'neutral' && availablePlayers.length > 0 ? (
                <select
                  value={eventPlayer}
                  onChange={(e) => setEventPlayer(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Seleccionar jugador</option>
                  {availablePlayers.map((player) => (
                    <option key={player} value={player}>
                      {player}
                    </option>
                  ))}
                </select>
              ) : quickAction !== 'note' ? (
                <input
                  value={eventPlayer}
                  onChange={(e) => setEventPlayer(e.target.value)}
                  placeholder="Jugador"
                  style={inputStyle}
                />
              ) : null}

              <input
                value={eventNote}
                onChange={(e) => setEventNote(e.target.value)}
                placeholder="Detalle opcional"
                style={inputStyle}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={addEventFromQuickAction} style={smallButton(getEventColor(quickAction))}>
                  GUARDAR
                </button>

                <button type="button" onClick={closeQuickAction} style={smallButton('#6b7280')}>
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}

        {events.length > 0 && (
          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            {events.map((event) => {
              const teamName =
                event.team === 'A'
                  ? teamAName
                  : event.team === 'B'
                    ? teamBName
                    : 'General'

              return (
                <div
                  key={event.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: '#f9fafb',
                    border: `1px solid ${getEventColor(event.type)}`,
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    {event.minute !== null && event.minute !== undefined ? `${event.minute}' · ` : ''}
                    {getStageLabel(event.stage)} · {teamName}
                  </div>

                  <div>
                    {getEventLabel(event.type)}: {event.player}
                  </div>

                  {event.note && (
                    <div style={{ color: '#666', fontSize: 13 }}>
                      {event.note}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeEvent(event.id)}
                    style={{
                      marginTop: 8,
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#dc2626',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Quitar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {startedAt && stage !== 'halftime' && stage !== 'penalties' && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 16,
            border: '1px solid #ddd',
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>
            Tiempo agregado
          </div>

          {!pauseStartedAt ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" onClick={() => startPause('Lesión')} style={smallButton('#ea580c')}>
                Lesión / pausa
              </button>

              <button type="button" onClick={() => startPause('Reclamo')} style={smallButton('#111827')}>
                Reclamo / revisión
              </button>

              <button type="button" onClick={addManualAddedMinute} style={smallButton('#2563eb')}>
                +1 min manual
              </button>

              <button type="button" onClick={removeManualAddedMinute} style={smallButton('#6b7280')}>
                -1 min manual
              </button>
            </div>
          ) : (
            <button type="button" onClick={endPause} style={stageButton('#dc2626')}>
              TERMINAR PAUSA (+{formatTime(pauseSeconds)})
            </button>
          )}
        </div>
      )}

      {startedAt && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 16,
            border: '1px solid #ddd',
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>
            Control de tiempos
          </div>

          {stage === 'first_half' && (
            <button type="button" onClick={finishFirstHalf} style={stageButton('#111827')}>
              FINALIZAR 1ER TIEMPO
            </button>
          )}

          {stage === 'halftime' && (
            <button type="button" onClick={startSecondHalf} style={stageButton('#2563eb')}>
              INICIAR 2DO TIEMPO
            </button>
          )}

          {stage === 'second_half' && isTimeFinished && isTie && (
            <button type="button" onClick={goToExtraTime} style={stageButton('#f59e0b')}>
              IR A TIEMPO EXTRA
            </button>
          )}

          {stage === 'extra_time' && isTimeFinished && isTie && (
            <button type="button" onClick={goToPenalties} style={stageButton('#7c3aed')}>
              IR A PENALES
            </button>
          )}

          {stage === 'second_half' && isTimeFinished && !isTie && (
            <div style={{ fontWeight: 'bold', color: '#166534' }}>
              La final ya puede finalizarse.
            </div>
          )}

          {stage === 'extra_time' && isTimeFinished && !isTie && (
            <div style={{ fontWeight: 'bold', color: '#166534' }}>
              La final ya puede finalizarse después del tiempo extra.
            </div>
          )}
        </div>
      )}

      {stage === 'penalties' && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 16,
            border: '1px solid #c4b5fd',
            background: '#f5f3ff',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>Penales</div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 12,
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
              {teamAName}
              <div style={{ fontSize: 38 }}>{penaltyA}</div>
            </div>

            <div style={{ fontSize: 24, fontWeight: 'bold' }}>-</div>

            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
              {teamBName}
              <div style={{ fontSize: 38 }}>{penaltyB}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <button type="button" onClick={() => setPenaltyA((value) => value + 1)} style={smallButton('#16a34a')}>
              + Penal {teamAName}
            </button>

            <button type="button" onClick={() => setPenaltyB((value) => value + 1)} style={smallButton('#16a34a')}>
              + Penal {teamBName}
            </button>

            <button type="button" onClick={() => setPenaltyA((value) => Math.max(0, value - 1))} disabled={penaltyA === 0} style={smallButton(penaltyA === 0 ? '#bbb' : '#dc2626')}>
              - Penal {teamAName}
            </button>

            <button type="button" onClick={() => setPenaltyB((value) => Math.max(0, value - 1))} disabled={penaltyB === 0} style={smallButton(penaltyB === 0 ? '#bbb' : '#dc2626')}>
              - Penal {teamBName}
            </button>
          </div>

          {penaltyA === penaltyB && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <button type="button" onClick={() => setWinnerTeamId(teamAId ?? null)} style={smallButton(winnerTeamId === teamAId ? '#16a34a' : '#111')}>
                Gana {teamAName}
              </button>

              <button type="button" onClick={() => setWinnerTeamId(teamBId ?? null)} style={smallButton(winnerTeamId === teamBId ? '#16a34a' : '#111')}>
                Gana {teamBName}
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={finishMatch}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 'bold' }}>
            Nota del árbitro / incidencias
          </label>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: 12,
              marginTop: 6,
              resize: 'vertical',
              fontFamily: 'Arial, sans-serif',
              borderRadius: 12,
              border: '1px solid #ccc',
              fontSize: 16,
            }}
            placeholder="Ej. Incidente, reclamo, aclaración..."
          />

          <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
            {savingNote ? 'Guardando nota...' : 'La nota se guarda automáticamente'}
          </div>
        </div>

        {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

        <button
          type="submit"
          disabled={loading || !startedAt}
          style={{
            width: '100%',
            padding: 18,
            background: !startedAt ? '#999' : 'black',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: !startedAt ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: 22,
          }}
        >
          {loading ? 'Guardando...' : 'FINALIZAR FINAL'}
        </button>

        {!startedAt && (
          <p style={{ marginTop: 10, color: '#666' }}>
            Debes iniciar la final antes de capturar resultado.
          </p>
        )}
      </form>
    </div>
  )
}

function stageButton(background: string) {
  return {
    width: '100%',
    padding: 14,
    background,
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontWeight: 'bold',
    fontSize: 18,
    cursor: 'pointer',
  } as const
}

function smallButton(background: string) {
  return {
    padding: 14,
    background,
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
  } as const
}

function quickButton(background: string) {
  return {
    width: '100%',
    padding: 16,
    background,
    color: 'white',
    border: 'none',
    borderRadius: 14,
    fontWeight: 'bold',
    fontSize: 18,
    cursor: 'pointer',
  } as const
}

const inputStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid #ccc',
  fontSize: 15,
} as const