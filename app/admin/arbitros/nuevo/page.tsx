'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminNuevoArbitroPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/referee-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo crear el árbitro')
        setLoading(false)
        return
      }

      router.push('/admin/arbitros')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear el árbitro')
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
        href="/admin/arbitros"
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
        ← Admin Árbitros
      </a>

      <h1 style={{ marginTop: 0, marginBottom: 18 }}>Crear árbitro</h1>

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
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>
            Nombre
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={input}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>
            Usuario
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={input}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>
            Contraseña
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={input}
          />
        </div>

        {error && (
          <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={btnGreen}
        >
          {loading ? 'Guardando...' : 'Guardar árbitro'}
        </button>
      </form>
    </main>
  )
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