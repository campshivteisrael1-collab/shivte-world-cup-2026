'use client'

import { useEffect, useMemo, useState } from 'react'

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

  if (match.phase === 'quarterfinal') {
    return 'Cuartos de final'
  }

  if (match.phase === 'semifinal') {
    return 'Semifinal'
  }

  if (match.phase === 'final') {
    return 'Final'
  }

  return match.phase || 'Partido'
}

export default function LiveMatchView({ match }: { match: any }) {
  const [now, setNow] = useState(Date.now())

  const [scoreA, setScoreA] = useState(match.live_score_a ?? 0)
  const [scoreB, setScoreB] = useState(match.live_score_b ?? 0)

  const [status, setStatus] = useState(match.status)
  const [startedAt, setStartedAt] = useState(match.started_at)

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
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        background: bgColor,
        border: '1px solid #ddd',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: 16 }}>
        {getMatchTitle(match)}
      </div>

      <div style={{ fontSize: 13, color: '#666' }}>
        {match.sport?.display_name || match.sport?.name}
      </div>

      {match.match_time && (
        <div style={{ fontSize: 13, color: '#666' }}>
          {match.match_time}
        </div>
      )}

      <div style={{ marginTop: 10, fontWeight: 'bold' }}>
        {match.teamA?.name} vs {match.teamB?.name}
      </div>

      {startedAt && status !== 'submitted' && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            background: '#fff',
          }}
        >
          <div style={{ fontSize: 12 }}>Tiempo restante</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>
            {formatTime(remainingSeconds)}
          </div>

          {remainingSeconds <= 0 && (
            <div style={{ color: 'red', fontWeight: 'bold' }}>
              Tiempo terminado
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          fontSize: 30,
          fontWeight: 'bold',
          textAlign: 'center',
        }}
      >
        {scoreA} - {scoreB}
      </div>

      <div style={{ marginTop: 10, fontSize: 12 }}>
        {status === 'submitted' && 'CAPTURADO'}
        {status !== 'submitted' && startedAt && 'EN JUEGO'}
        {!startedAt && 'PENDIENTE'}
      </div>

      {status === 'submitted' && (
        <div style={{ marginTop: 10, fontWeight: 'bold' }}>
          Resultado final
        </div>
      )}
    </div>
  )
}