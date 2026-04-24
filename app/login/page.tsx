'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const text = await res.text()

      let json: any = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch {
        setError(`La API no devolvió JSON. Revisa app/api/login/route.ts`)
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(json.error || 'Error al iniciar sesión')
        setLoading(false)
        return
      }

      router.push('/referee')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Error inesperado')
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: 380,
          background: '#fff',
          padding: 24,
          borderRadius: 16,
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <a href="/" style={pillBlack}>← Inicio</a>
          <a href="/tabla" style={pillGreen}>Ver tabla general</a>
        </div>

        <h2 style={{ marginBottom: 4 }}>SHIVTE WORLD CUP 2026</h2>

        <p style={{ marginBottom: 16, color: '#666' }}>
          Login de árbitros
        </p>

        <label>Usuario</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={input}
        />

        <label>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />

        {error && (
          <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            marginTop: 16,
            width: '100%',
            padding: 12,
            background: '#000',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </main>
  )
}

const input = {
  width: '100%',
  padding: 10,
  marginBottom: 12,
  borderRadius: 8,
  border: '1px solid #ccc',
}

const pillBlack = {
  padding: '6px 12px',
  background: '#111827',
  color: 'white',
  borderRadius: 999,
  textDecoration: 'none',
  fontSize: 12,
  fontWeight: 'bold',
}

const pillGreen = {
  padding: '6px 12px',
  background: '#0f766e',
  color: 'white',
  borderRadius: 999,
  textDecoration: 'none',
  fontSize: 12,
  fontWeight: 'bold',
}