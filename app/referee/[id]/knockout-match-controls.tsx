'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const secs = safe % 60
  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`
}

export default function KnockoutMatchControls({
  matchId,
  teamAName,
  teamBName,
  initialLiveScoreA,
  initialLiveScoreB,
  initialNote,
  initialStartedAt,
  teamAId,
  teamBId,
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
}) {
  const router = useRouter()

  const [scoreA, setScoreA] = useState(initialLiveScoreA ?? 0)
  const [scoreB, setScoreB] = useState(initialLiveScoreB ?? 0)
  const [penaltyA, setPenaltyA] = useState(0)
  const [penaltyB, setPenaltyB] = useState(0)

  const [note, setNote] = useState(initialNote ?? '')
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt ?? null)
  const [extraStartedAt, setExtraStartedAt] = useState<string | null>(null)

  const [mode, setMode] = useState<'normal' | 'extra_time' | 'penalties'>('normal')
  const [winnerTeamId, setWinnerTeamId] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [savingScore, setSavingScore] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  const noteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const firstRenderRef = useRef(true)

  const normalDurationMinutes = 20
  const extraDurationMinutes = 5

  const timerStart = mode === 'extra_time' ? extraStartedAt : startedAt
  const durationMinutes = mode === 'extra_time' ? extraDurationMinutes : normalDurationMinutes

  useEffect(() => {
    if (!timerStart) return

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [timerStart])

  const remainingSeconds = useMemo(() => {
    if (!timerStart) return durationMinutes * 60

    const startMs = new Date(timerStart).getTime()
    const endMs = startMs + durationMinutes * 60 * 1000

    return Math.ceil((endMs - now) / 1000)
  }, [timerStart, now, durationMinutes])

  const isTie = scoreA === scoreB
  const isTimeFinished = Boolean(timerStart) && remainingSeconds <= 0
  const isLastMinute = Boolean(timerStart) && remainingSeconds <= 60 && remainingSeconds > 0

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
      setError('Debes iniciar el partido antes de mover el marcador')
      return
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
        return
      }

      setScoreA(result.live_score_a)
      setScoreB(result.live_score_b)
      setSavingScore(false)
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el marcador')
      setSavingScore(false)
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

  function goToExtraTime() {
    const nowIso = new Date().toISOString()

    setMode('extra_time')
    setExtraStartedAt(nowIso)
    setWinnerTeamId(null)
    setNow(Date.now())
    setError('')
  }

  function goToPenalties() {
    setMode('penalties')
    setWinnerTeamId(null)
    setError('')
  }

  function getResolution() {
    if (mode === 'extra_time') return 'extra_time'
    if (mode === 'penalties') return 'penalties'
    return 'regular'
  }

  function getPenaltyWinnerId() {
    if (penaltyA > penaltyB) return teamAId ?? null
    if (penaltyB > penaltyA) return teamBId ?? null
    return winnerTeamId
  }

  async function finishMatch(e?: React.FormEvent) {
    e?.preventDefault()

    setError('')

    if (!startedAt) {
      setError('Debes iniciar el partido antes de guardar el resultado')
      return
    }

    if (isTie && mode === 'normal') {
      setError('El partido está empatado. Debes ir a tiempo extra.')
      return
    }

    if (isTie && mode === 'extra_time') {
      setError('Sigue empatado. Debes ir a penales.')
      return
    }

    let finalWinnerTeamId =
      scoreA > scoreB
        ? teamAId ?? null
        : scoreB > scoreA
          ? teamBId ?? null
          : null

    if (mode === 'penalties') {
      finalWinnerTeamId = getPenaltyWinnerId()

      if (penaltyA === penaltyB && !winnerTeamId) {
        setError('En penales debe haber ganador. Sube el marcador de penales o selecciona ganador.')
        return
      }
    }

    if (!finalWinnerTeamId) {
      setError('No se pudo definir ganador. Revisa que los equipos estén cargados.')
      return
    }

    const penaltyText =
      mode === 'penalties'
        ? `Penales: ${teamAName} ${penaltyA} - ${penaltyB} ${teamBName}`
        : ''

    const finalNote = [note, penaltyText].filter(Boolean).join('\n')

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
        setError(result.error || 'No se pudo finalizar el partido')
        setLoading(false)
        return
      }

      router.push('/referee')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo finalizar el partido')
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 20, maxWidth: 720 }}>
      <div
        style={{
          marginBottom: 14,
          fontWeight: 'bold',
          color: startedAt ? '#2563eb' : '#666',
        }}
      >
        Status: {startedAt ? 'EN JUEGO' : 'PENDIENTE'}
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
          {loading ? 'Iniciando...' : 'INICIAR PARTIDO'}
        </button>
      ) : mode !== 'penalties' ? (
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
            {mode === 'extra_time' ? 'Tiempo extra' : 'Tiempo restante'}
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
            marginBottom: 18,
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <div style={{ border: '1px solid #eee', borderRadius: 14, padding: 14 }}>
            <div style={{ marginBottom: 10, fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>
              {teamAName}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => updateScore(scoreA + 1, scoreB)}
                disabled={savingScore || !startedAt || loading || mode === 'penalties'}
                style={{
                  width: '100%',
                  padding: 16,
                  background: !startedAt || mode === 'penalties' ? '#999' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: !startedAt || mode === 'penalties' ? 'not-allowed' : 'pointer',
                  fontSize: 22,
                  fontWeight: 'bold',
                }}
              >
                + Punto {teamAName}
              </button>

              <button
                type="button"
                onClick={() => updateScore(Math.max(0, scoreA - 1), scoreB)}
                disabled={savingScore || !startedAt || scoreA === 0 || loading || mode === 'penalties'}
                style={{
                  width: '100%',
                  padding: 16,
                  background: !startedAt || scoreA === 0 || mode === 'penalties' ? '#bbb' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: !startedAt || scoreA === 0 || mode === 'penalties' ? 'not-allowed' : 'pointer',
                  fontSize: 22,
                  fontWeight: 'bold',
                }}
              >
                - Punto {teamAName}
              </button>
            </div>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 14, padding: 14 }}>
            <div style={{ marginBottom: 10, fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>
              {teamBName}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => updateScore(scoreA, scoreB + 1)}
                disabled={savingScore || !startedAt || loading || mode === 'penalties'}
                style={{
                  width: '100%',
                  padding: 16,
                  background: !startedAt || mode === 'penalties' ? '#999' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: !startedAt || mode === 'penalties' ? 'not-allowed' : 'pointer',
                  fontSize: 22,
                  fontWeight: 'bold',
                }}
              >
                + Punto {teamBName}
              </button>

              <button
                type="button"
                onClick={() => updateScore(scoreA, Math.max(0, scoreB - 1))}
                disabled={savingScore || !startedAt || scoreB === 0 || loading || mode === 'penalties'}
                style={{
                  width: '100%',
                  padding: 16,
                  background: !startedAt || scoreB === 0 || mode === 'penalties' ? '#bbb' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: !startedAt || scoreB === 0 || mode === 'penalties' ? 'not-allowed' : 'pointer',
                  fontSize: 22,
                  fontWeight: 'bold',
                }}
              >
                - Punto {teamBName}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isTie && startedAt && isTimeFinished && mode !== 'penalties' && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 16,
            border: '1px solid #facc15',
            background: '#fffbeb',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 10 }}>
            Eliminatoria empatada
          </div>

          {mode === 'normal' && (
            <button
              type="button"
              onClick={goToExtraTime}
              style={{
                width: '100%',
                padding: 14,
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 'bold',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              IR A TIEMPO EXTRA
            </button>
          )}

          {mode === 'extra_time' && (
            <button
              type="button"
              onClick={goToPenalties}
              style={{
                width: '100%',
                padding: 14,
                background: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 'bold',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              IR A PENALES
            </button>
          )}
        </div>
      )}

      {isTie && startedAt && mode === 'penalties' && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 16,
            border: '1px solid #c4b5fd',
            background: '#f5f3ff',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>
            Penales
          </div>

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
            <button
              type="button"
              onClick={() => setPenaltyA((value) => value + 1)}
              style={{
                padding: 14,
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              + Penal {teamAName}
            </button>

            <button
              type="button"
              onClick={() => setPenaltyB((value) => value + 1)}
              style={{
                padding: 14,
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              + Penal {teamBName}
            </button>

            <button
              type="button"
              onClick={() => setPenaltyA((value) => Math.max(0, value - 1))}
              disabled={penaltyA === 0}
              style={{
                padding: 14,
                background: penaltyA === 0 ? '#bbb' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 'bold',
                cursor: penaltyA === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              - Penal {teamAName}
            </button>

            <button
              type="button"
              onClick={() => setPenaltyB((value) => Math.max(0, value - 1))}
              disabled={penaltyB === 0}
              style={{
                padding: 14,
                background: penaltyB === 0 ? '#bbb' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 'bold',
                cursor: penaltyB === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              - Penal {teamBName}
            </button>
          </div>

          {penaltyA === penaltyB && (
            <div style={{ fontSize: 13, color: '#6d28d9', fontWeight: 'bold' }}>
              Si el marcador de penales queda empatado, selecciona manualmente al ganador.
            </div>
          )}

          {penaltyA === penaltyB && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setWinnerTeamId(teamAId ?? null)}
                style={{
                  padding: 14,
                  background: winnerTeamId === teamAId ? '#16a34a' : '#111',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Gana {teamAName}
              </button>

              <button
                type="button"
                onClick={() => setWinnerTeamId(teamBId ?? null)}
                style={{
                  padding: 14,
                  background: winnerTeamId === teamBId ? '#16a34a' : '#111',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Gana {teamBName}
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={finishMatch}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 'bold' }}>
            Nota del árbitro (solo árbitro y admin)
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
            placeholder="Ej. Tiempo extra, penales, incidente..."
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
          {loading ? 'Guardando...' : 'FINALIZAR PARTIDO'}
        </button>

        {!startedAt && (
          <p style={{ marginTop: 10, color: '#666' }}>
            Debes iniciar el partido antes de capturar resultado.
          </p>
        )}
      </form>
    </div>
  )
}