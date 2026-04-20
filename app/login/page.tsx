'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const result = await res.json()

    if (!res.ok) {
      setError(result.error || 'Error al iniciar sesión')
      setLoading(false)
      return
    }

    router.push('/referee')
    router.refresh()
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f4f4f4',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: 360,
          background: 'white',
          padding: 24,
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        }}
      >
        <h1 style={{ marginBottom: 8 }}>SHIVTE WORLD CUP 2026</h1>
        <p style={{ marginBottom: 20, color: '#666' }}>Login de árbitros</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ccc',
              borderRadius: 8,
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              border: '1px solid #ccc',
              borderRadius: 8,
            }}
          />
        </div>

        {error && (
          <p style={{ color: 'red', marginBottom: 16 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            background: 'black',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}