'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function EditarUsuarioPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const [canMatches, setCanMatches] = useState(false)
  const [canTeams, setCanTeams] = useState(false)
  const [canSports, setCanSports] = useState(false)
  const [canReferees, setCanReferees] = useState(false)
  const [canUsers, setCanUsers] = useState(false)
  const [canReset, setCanReset] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/user-detail?id=${id}`, {
        cache: 'no-store',
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'No se pudo cargar el usuario')
        setLoading(false)
        return
      }

      const u = json.user

      setName(u.name || '')
      setUsername(u.username || '')
      setIsActive(u.is_active !== false)
      setIsSuperAdmin(!!u.is_super_admin)

      setCanMatches(!!u.can_manage_matches)
      setCanTeams(!!u.can_manage_teams)
      setCanSports(!!u.can_manage_sports)
      setCanReferees(!!u.can_manage_referees)
      setCanUsers(!!u.can_manage_users)
      setCanReset(!!u.can_reset_tournament)

      setLoading(false)
    }

    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/user-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name,
        username,
        password,
        is_active: isActive,
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

    setSaving(false)

    if (!res.ok) {
      setError(json.error || 'No se pudo guardar')
      return
    }

    router.push('/admin/usuarios')
    router.refresh()
  }

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  return (
    <main style={{ padding: 16, maxWidth: 640, margin: '0 auto' }}>
      <a href="/admin/usuarios">← Usuarios</a>

      <h1>Editar usuario</h1>

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
        placeholder="Nueva contraseña (dejar vacío para no cambiar)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={input}
      />

      <label style={label}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Usuario activo
      </label>

      <label style={label}>
        <input
          type="checkbox"
          checked={isSuperAdmin}
          onChange={(e) => setIsSuperAdmin(e.target.checked)}
        />
        Admin general
      </label>

      <h3>Permisos</h3>

      <label style={label}>
        <input
          type="checkbox"
          checked={canMatches}
          onChange={(e) => setCanMatches(e.target.checked)}
        />
        Partidos
      </label>

      <label style={label}>
        <input
          type="checkbox"
          checked={canTeams}
          onChange={(e) => setCanTeams(e.target.checked)}
        />
        Equipos
      </label>

      <label style={label}>
        <input
          type="checkbox"
          checked={canSports}
          onChange={(e) => setCanSports(e.target.checked)}
        />
        Deportes
      </label>

      <label style={label}>
        <input
          type="checkbox"
          checked={canReferees}
          onChange={(e) => setCanReferees(e.target.checked)}
        />
        Árbitros
      </label>

      <label style={label}>
        <input
          type="checkbox"
          checked={canUsers}
          onChange={(e) => setCanUsers(e.target.checked)}
        />
        Usuarios
      </label>

      <label style={label}>
        <input
          type="checkbox"
          checked={canReset}
          onChange={(e) => setCanReset(e.target.checked)}
        />
        Reiniciar torneo
      </label>

      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

      <button
        onClick={handleSave}
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
        {saving ? 'Guardando...' : 'Guardar cambios'}
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