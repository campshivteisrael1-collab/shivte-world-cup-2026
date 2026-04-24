'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function EditarArbitroPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [sportId, setSportId] = useState('')
  const [isActive, setIsActive] = useState(true)

  const [sports, setSports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setErrorMsg('')

      const res = await fetch(`/api/admin/referee-detail?id=${id}`, {
        cache: 'no-store',
      })

      const json = await res.json()

      if (!res.ok || !json.referee) {
        setErrorMsg(json?.error || 'No se encontró el árbitro')
        setLoading(false)
        return
      }

      setName(json.referee.name || '')
      setUsername(json.referee.username || '')
      setSportId(json.referee.sport_id ? String(json.referee.sport_id) : '')
      setIsActive(json.referee.is_active !== false)
      setSports(json.sports || [])

      setLoading(false)
    }

    load()
  }, [id])

  async function handleSave() {
    if (!name.trim() || !username.trim()) {
      setErrorMsg('Nombre y usuario son obligatorios')
      return
    }

    setSaving(true)
    setErrorMsg('')

    const res = await fetch('/api/admin/referee-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name,
        username,
        password,
        sport_id: sportId ? Number(sportId) : null,
        is_active: isActive,
      }),
    })

    const json = await res.json()

    setSaving(false)

    if (!res.ok) {
      setErrorMsg(json?.error || 'Error al guardar')
      return
    }

    router.push('/admin/arbitros')
  }

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 560,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <button
        onClick={() => router.push('/admin/arbitros')}
        style={{
          marginBottom: 18,
          padding: '8px 14px',
          background: '#111827',
          color: 'white',
          borderRadius: 999,
          border: 'none',
          fontWeight: 'bold',
          fontSize: 14,
        }}
      >
        ← Admin Árbitros
      </button>

      <h1 style={{ marginBottom: 22, fontSize: 22 }}>Editar árbitro</h1>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 22,
          padding: 22,
          background: 'white',
        }}
      >
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>
          Nombre
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 14,
            border: '1px solid #ccc',
            fontSize: 16,
            marginBottom: 18,
          }}
        />

        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>
          Usuario
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 14,
            border: '1px solid #ccc',
            fontSize: 16,
            marginBottom: 18,
          }}
        />

        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>
          Nueva contraseña
        </label>
        <input
          type="password"
          value={password}
          placeholder="Déjalo vacío si no quieres cambiarla"
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 14,
            border: '1px solid #ccc',
            fontSize: 16,
            marginBottom: 18,
          }}
        />

        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>
          Deporte que controla
        </label>
        <select
          value={sportId}
          onChange={(e) => setSportId(e.target.value)}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 14,
            border: '1px solid #ccc',
            fontSize: 16,
            marginBottom: 18,
          }}
        >
          <option value="">Selecciona deporte</option>
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.display_name || sport.name}
            </option>
          ))}
        </select>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 'bold',
            marginBottom: 18,
          }}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Árbitro activo
        </label>

        {errorMsg && (
          <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: 14,
            background: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: 14,
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </main>
  )
}