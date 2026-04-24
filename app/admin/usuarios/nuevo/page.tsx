'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevoUsuarioPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const [canMatches, setCanMatches] = useState(false)
  const [canTeams, setCanTeams] = useState(false)
  const [canSports, setCanSports] = useState(false)
  const [canReferees, setCanReferees] = useState(false)
  const [canUsers, setCanUsers] = useState(false)
  const [canReset, setCanReset] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/user-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        username,
        password,
        is_super_admin: isSuperAdmin,
        can_manage_matches: canMatches,
        can_manage_teams: canTeams,
        can_manage_sports: canSports,
        can_manage_referees: canReferees,
        can_manage_users: canUsers,
        can_reset_tournament: canReset,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error || 'Error al crear usuario')
      setSaving(false)
      return
    }

    router.push('/admin/usuarios')
  }

  return (
    <main style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
      <a href="/admin/usuarios">← Usuarios</a>

      <h1>Crear usuario</h1>

      <input
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={input}
      />

      <input
        placeholder="Usuario"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={input}
      />

      <input
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={input}
      />

      <label style={label}>
        <input
          type="checkbox"
          checked={isSuperAdmin}
          onChange={(e) => setIsSuperAdmin(e.target.checked)}
        />
        Admin general (acceso total)
      </label>

      <h3>Permisos</h3>

      <label style={label}>
        <input type="checkbox" checked={canMatches} onChange={(e) => setCanMatches(e.target.checked)} />
        Partidos
      </label>

      <label style={label}>
        <input type="checkbox" checked={canTeams} onChange={(e) => setCanTeams(e.target.checked)} />
        Equipos
      </label>

      <label style={label}>
        <input type="checkbox" checked={canSports} onChange={(e) => setCanSports(e.target.checked)} />
        Deportes
      </label>

      <label style={label}>
        <input type="checkbox" checked={canReferees} onChange={(e) => setCanReferees(e.target.checked)} />
        Árbitros
      </label>

      <label style={label}>
        <input type="checkbox" checked={canUsers} onChange={(e) => setCanUsers(e.target.checked)} />
        Usuarios
      </label>

      <label style={label}>
        <input type="checkbox" checked={canReset} onChange={(e) => setCanReset(e.target.checked)} />
        Reiniciar torneo
      </label>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        style={{
          marginTop: 16,
          padding: 12,
          width: '100%',
          background: '#059669',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          fontWeight: 'bold',
        }}
      >
        {saving ? 'Guardando...' : 'Crear usuario'}
      </button>
    </main>
  )
}

const input = {
  width: '100%',
  padding: 10,
  marginBottom: 10,
  borderRadius: 8,
  border: '1px solid #ccc',
}

const label = {
  display: 'block',
  marginBottom: 8,
}