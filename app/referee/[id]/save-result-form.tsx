'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SaveResultForm({
  matchId,
  teamAName,
  teamBName,
  scoreA,
  scoreB,
  refereeNote,
}: {
  matchId: string
  teamAName: string
  teamBName: string
  scoreA: number | null
  scoreB: number | null
  refereeNote: string | null
}) {
  const router = useRouter()
  const [a, setA] = useState(scoreA?.toString() ?? '')
  const [b, setB] = useState(scoreB?.toString() ?? '')
  const [note, setNote] = useState(refereeNote ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          scoreA: a,
          scoreB: b,
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

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 20, maxWidth: 450 }}>
      <div style={{ marginBottom: 12 }}>
        <label>{teamAName}</label>
        <input
          type="number"
          value={a}
          onChange={(e) => setA(e.target.value)}
          style={{ width: '100%', padding: 10, marginTop: 4 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>{teamBName}</label>
        <input
          type="number"
          value={b}
          onChange={(e) => setB(e.target.value)}
          style={{ width: '100%', padding: 10, marginTop: 4 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Nota del árbitro (solo árbitro y admin)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: 10,
            marginTop: 4,
            resize: 'vertical',
            fontFamily: 'Arial, sans-serif',
          }}
          placeholder="Ej. Perdió por default, tarjeta roja, incidente, observaciones..."
        />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: 12,
          background: 'black',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        {loading ? 'Guardando...' : 'Guardar resultado'}
      </button>
    </form>
  )
}