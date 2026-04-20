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

export default function LiveMatchControls({
  matchId,
  teamAName,
  teamBName,
  initialLiveScoreA,
  initialLiveScoreB,
  initialNote,
  initialStartedAt,
}: {
  matchId: string
  teamAName: string
  teamBName: string
  initialLiveScoreA: number | null
  initialLiveScoreB: number | null
  initialNote: string | null
  initialStartedAt: string | null
}) {
  const router = useRouter()

  const [scoreA, setScoreA] = useState(initialLiveScoreA ?? 0)
  const [scoreB, setScoreB] = useState(initialLiveScoreB ?? 0)
  const [note, setNote] = useState(initialNote ?? '')
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt)
  const [loading, setLoading] = useState(false)
  const [savingScore, setSavingScore] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  const noteTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const firstRenderRef = useRef(true)

  useEffect(() => {
    if (!startedAt) return

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [startedAt])

  const remainingSeconds = useMemo(() => {
    if (!startedAt) return 20 * 60
    const startMs = new Date(startedAt).getTime()
    const endMs = startMs + 20 * 60 * 1000
    return Math.ceil((endMs - now) / 1000)
  }, [startedAt, now])

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

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo guardar la nota')
        setSavingNote(false)
        return
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
      if (noteTimeoutRef.current) {
        clearTimeout(noteTimeoutRef.current)
      }
    }
  }, [note])

  async function saveFinalResult(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          refereeNote: note,
        }),
      })

      const text = await res.text()

      let result: any = {}
      try {
        result = JSON.parse(text)
      } catch {
        setError(`La API no devolvió JSON. Respuesta: ${text.slice(0, 200)}`)
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(result.error || 'Error al guardar')
        setLoading(false)
        return
      }

      router.push('/referee')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar')
      setLoading(false)
    }
  }

  const statusLabel = startedAt ? 'EN JUEGO' : 'PENDIENTE'

  return (
    <div style={{ marginTop: 20, maxWidth: 720 }}>
      <div style={{ marginBottom: 14, fontWeight: 'bold', color: startedAt ? '#2563eb' : '#666' }}>
        Status: {statusLabel}
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
            cursor: 'pointer',
            marginBottom: 20,
            fontWeight: 'bold',
            fontSize: 22,
          }}
        >
          {loading ? 'Iniciando...' : 'INICIAR PARTIDO'}
        </button>
      ) : (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 16,
            background: remainingSeconds > 0 ? '#f4f4f4' : '#ffe8e8',
            border: '1px solid #ddd',
          }}
        >
          <div style={{ fontSize: 13, color: '#666' }}>Tiempo restante</div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 'bold',
              lineHeight: 1.1,
            }}
          >
            {formatTime(remainingSeconds)}
          </div>
          {remainingSeconds <= 0 && (
            <div style={{ color: '#c00', marginTop: 8, fontWeight: 'bold' }}>
              Tiempo terminado
            </div>
          )}
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
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: 24 }}>{teamAName}</div>
            <div style={{ fontSize: 48, fontWeight: 'bold', lineHeight: 1.1 }}>
              {scoreA}
            </div>
          </div>

          <div style={{ fontSize: 30, fontWeight: 'bold' }}>VS</div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: 24 }}>{teamBName}</div>
            <div style={{ fontSize: 48, fontWeight: 'bold', lineHeight: 1.1 }}>
              {scoreB}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 16,
          }}
        >
          <div
            style={{
              border: '1px solid #eee',
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                marginBottom: 10,
                fontWeight: 'bold',
                fontSize: 18,
                textAlign: 'center',
              }}
            >
              {teamAName}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => updateScore(scoreA + 1, scoreB)}
                disabled={savingScore || !startedAt}
                style={{
                  width: '100%',
                  padding: 16,
                  background: !startedAt ? '#999' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: !startedAt ? 'not-allowed' : 'pointer',
                  fontSize: 22,
                  fontWeight: 'bold',
                }}
              >
                + Punto {teamAName}
              </button>

              <button
                type="button"
                onClick={() => updateScore(Math.max(0, scoreA - 1), scoreB)}
                disabled={savingScore || !startedAt || scoreA === 0}
                style={{
                  width: '100%',
                  padding: 16,
                  background: !startedAt || scoreA === 0 ? '#bbb' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor:
                    !startedAt || scoreA === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 22,
                  fontWeight: 'bold',
                }}
              >
                - Punto {teamAName}
              </button>
            </div>
          </div>

          <div
            style={{
              border: '1px solid #eee',
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                marginBottom: 10,
                fontWeight: 'bold',
                fontSize: 18,
                textAlign: 'center',
              }}
            >
              {teamBName}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => updateScore(scoreA, scoreB + 1)}
                disabled={savingScore || !startedAt}
                style={{
                  width: '100%',
                  padding: 16,
                  background: !startedAt ? '#999' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: !startedAt ? 'not-allowed' : 'pointer',
                  fontSize: 22,
                  fontWeight: 'bold',
                }}
              >
                + Punto {teamBName}
              </button>

              <button
                type="button"
                onClick={() => updateScore(scoreA, Math.max(0, scoreB - 1))}
                disabled={savingScore || !startedAt || scoreB === 0}
                style={{
                  width: '100%',
                  padding: 16,
                  background: !startedAt || scoreB === 0 ? '#bbb' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor:
                    !startedAt || scoreB === 0 ? 'not-allowed' : 'pointer',
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

      <form onSubmit={saveFinalResult}>
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
            placeholder="Ej. Perdió por default, tarjeta roja, incidente..."
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
          {loading ? 'Guardando...' : 'GUARDAR RESULTADO'}
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