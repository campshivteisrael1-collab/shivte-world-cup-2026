'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo iniciar sesión')
        setLoading(false)
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('No se pudo iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        fontFamily: 'Arial, sans-serif',
        background:
          'linear-gradient(180deg, #0b1220 0%, #0f2f6d 35%, #f3f4f6 75%, #ffffff 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#fff',
          borderRadius: 22,
          padding: 22,
          boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
          border: '1px solid #e5e7eb',
        }}
      >
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginBottom: 14,
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

        <div
          style={{
            fontSize: 13,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: '#6b7280',
            marginBottom: 8,
          }}
        >
          Admin
        </div>

        <h1 style={{ marginTop: 0, marginBottom: 18, fontSize: 34 }}>
          Iniciar sesión
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontWeight: 'bold',
                marginBottom: 6,
              }}
            >
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
            <label
              style={{
                display: 'block',
                fontWeight: 'bold',
                marginBottom: 6,
              }}
            >
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={input}
            />
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontWeight: 'bold' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 14,
              background: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 'bold',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}

const input = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid #d1d5db',
  fontSize: 15,
}