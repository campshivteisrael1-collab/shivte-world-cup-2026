'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminEditarEquipoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const teamId = Number(resolvedParams.id)

  const [teamName, setTeamName] = useState('')
  const [coachName, setCoachName] = useState('')
  const [playersText, setPlayersText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: team } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      const { data: players } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', teamId)
        .order('player_name')

      setTeamName(team?.name || '')
      setCoachName(team?.coach_name || '')
      setPlayersText(
        (players || []).map((p: any) => p.player_name).join('\n')
      )
      setLoading(false)
    }

    load()
  }, [teamId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const playerNames = playersText
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)

    try {
      const res = await fetch('/api/admin/team-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, teamName, coachName, playerNames }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo guardar')
        setSaving(false)
        return
      }

      router.push('/admin/equipos')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar')
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      '¿Seguro que quieres borrar este equipo? Esto quitará también sus jugadores.'
    )
    if (!ok) return

    setDeleting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/team-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo borrar')
        setDeleting(false)
        return
      }

      router.push('/admin/equipos')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo borrar')
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
      <a
        href="/admin/equipos"
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
        ← Admin Equipos
      </a>

      <h1 style={{ marginTop: 0, marginBottom: 18 }}>Editar equipo</h1>

      <form
        onSubmit={handleSave}
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
            Nombre del equipo
          </label>
          <input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              border: '1px solid #ccc',
              fontSize: 15,
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>
            Director técnico
          </label>
          <input
            value={coachName}
            onChange={(e) => setCoachName(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              border: '1px solid #ccc',
              fontSize: 15,
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>
            Jugadores
          </label>
          <textarea
            value={playersText}
            onChange={(e) => setPlayersText(e.target.value)}
            rows={10}
            placeholder={'Un jugador por línea'}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              border: '1px solid #ccc',
              fontSize: 15,
              resize: 'vertical',
              fontFamily: 'Arial, sans-serif',
            }}
          />
        </div>

        {error && (
          <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              padding: 14,
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 'bold',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              width: '100%',
              padding: 14,
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 'bold',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            {deleting ? 'Borrando...' : 'Borrar equipo'}
          </button>
        </div>
      </form>
    </main>
  )
}