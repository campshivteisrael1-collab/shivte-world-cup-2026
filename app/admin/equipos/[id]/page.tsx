'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminEditarEquipoPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [teamName, setTeamName] = useState('')
  const [coachName, setCoachName] = useState('')
  const [playersText, setPlayersText] = useState('')
  const [logoUrl, setLogoUrl] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      setSuccess('')

      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single()

      const { data: players } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', id)
        .order('player_name')

      if (teamError || !team) {
        setError('No se pudo cargar el equipo')
        setLoading(false)
        return
      }

      setTeamName(team.name || '')
      setCoachName(team.coach_name || '')
      setLogoUrl(team.logo_url || '')
      setPlayersText((players || []).map((p) => p.player_name).join('\n'))
      setLoading(false)
    }

    if (id) load()
  }, [id])

  const playerNames = useMemo(() => {
    return playersText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
  }, [playersText])

  async function handleSave() {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const res = await fetch('/api/admin/team-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: id,
          name: teamName,
          coachName,
          logoUrl,
          playerNames,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo guardar')
        setSaving(false)
        return
      }

      setSuccess('Equipo actualizado correctamente')
      setSaving(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar')
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      '¿Seguro que quieres borrar este equipo? Esta acción no se puede deshacer.'
    )
    if (!ok) return

    try {
      setDeleting(true)
      setError('')
      setSuccess('')

      const res = await fetch('/api/admin/team-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: id }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo borrar')
        setDeleting(false)
        return
      }

      setDeleting(false)
      router.push('/admin/equipos')
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'No se pudo borrar')
      setDeleting(false)
    }
  }

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
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
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <a href="/" style={pillBlack}>← Inicio</a>
        <a href="/admin" style={pillBlack}>← Admin</a>
        <a href="/admin/equipos" style={pillBlack}>← Equipos</a>
        <a href="/tabla#clasificacion-general" style={pillGreen}>Ver tabla general</a>
      </div>

      <h1 style={{ marginTop: 0, marginBottom: 18 }}>
        Editar equipo
      </h1>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 18,
          padding: 16,
          background: '#fff',
          boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nombre del equipo</label>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            style={input}
            placeholder="Nombre del equipo"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Director técnico</label>
          <input
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            style={input}
            placeholder="Nombre del DT"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Logo URL</label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            style={input}
            placeholder="/team-logos/alemania.png"
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Jugadores</label>
          <textarea
            value={playersText}
            onChange={(e) => setPlayersText(e.target.value)}
            style={{ ...input, minHeight: 180, resize: 'vertical' }}
            placeholder={'Uno por línea\nJacobo\nYosef\nDaniel'}
          />
          <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
            Total de jugadores detectados: <strong>{playerNames.length}</strong>
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 14,
              color: '#b91c1c',
              fontWeight: 'bold',
            }}
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            style={{
              marginBottom: 14,
              color: '#166534',
              fontWeight: 'bold',
            }}
          >
            {success}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 14px',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '10px 14px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? 'Borrando...' : 'Borrar equipo'}
          </button>
        </div>
      </div>
    </main>
  )
}

const label = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: 6,
} as const

const input = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid #ccc',
  fontSize: 15,
} as const

const pillBlack = {
  display: 'inline-block',
  padding: '8px 14px',
  background: '#111827',
  color: 'white',
  borderRadius: 999,
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: 14,
} as const

const pillGreen = {
  display: 'inline-block',
  padding: '8px 14px',
  background: '#0f766e',
  color: 'white',
  borderRadius: 999,
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: 14,
} as const