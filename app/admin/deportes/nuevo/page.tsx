'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevoDeportePage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [location, setLocation] = useState('')
  const [rules, setRules] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/sport-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          display_name: displayName,
          location,
          rules,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al crear deporte')
        setLoading(false)
        return
      }

      router.push('/admin/deportes')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Error inesperado')
      setLoading(false)
    }
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
        href="/admin/deportes"
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
        ← Admin Deportes
      </a>

      <h1 style={{ marginTop: 0, marginBottom: 18 }}>Crear deporte</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          border: '1px solid #ddd',
          borderRadius: 18,
          background: '#fff',
          padding: 18,
          boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nombre interno</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={input}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nombre visible</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            style={input}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Ubicación</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={input}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Reglas</label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={6}
            style={{
              ...input,
              resize: 'vertical',
              fontFamily: 'Arial, sans-serif',
            }}
          />
        </div>

        {error && (
          <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>
        )}

        <button type="submit" disabled={loading} style={btnGreen}>
          {loading ? 'Guardando...' : 'Crear deporte'}
        </button>
      </form>
    </main>
  )
}

const label = {
  fontWeight: 'bold',
  display: 'block',
  marginBottom: 6,
}

const input = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid #ccc',
  fontSize: 15,
}

const btnGreen = {
  width: '100%',
  padding: 14,
  background: '#059669',
  color: 'white',
  border: 'none',
  borderRadius: 12,
  fontWeight: 'bold',
  fontSize: 16,
  cursor: 'pointer',
}