'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function phaseLabel(phase: string) {
  if (phase === 'regular') return 'regular'
  if (phase === 'quarterfinal') return 'quarterfinal'
  if (phase === 'semifinal') return 'semifinal'
  if (phase === 'final') return 'final'
  return phase || '—'
}

export default function AdminEditarArbitroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const profileId = resolvedParams.id

  const [referee, setReferee] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [sports, setSports] = useState<any[]>([])
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: referee } = await supabase
        .from('referees')
        .select('*')
        .eq('profile_id', profileId)
        .single()

      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('referee_id', profileId)

      const { data: teams } = await supabase
        .from('teams')
        .select('*')

      const { data: sports } = await supabase
        .from('Sports')
        .select('*')

      setReferee(referee)
      setMatches(matches || [])
      setTeams(teams || [])
      setSports(sports || [])

      setName(referee?.name || '')
      setUsername(referee?.username || '')
      setPassword(referee?.password || '')
    }

    load()
  }, [profileId])

  const enrichedMatches = useMemo(() => {
    return matches.map((m) => ({
      ...m,
      teamAName: teams.find((t) => t.id === m.team_a_id)?.name || '—',
      teamBName: teams.find((t) => t.id === m.team_b_id)?.name || '—',
      sportName:
        sports.find((s) => s.id === m.sport_id)?.display_name ||
        sports.find((s) => s.id === m.sport_id)?.name ||
        '—',
    }))
  }, [matches, teams, sports])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/admin/referee-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, name, username, password }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo guardar')
        setSaving(false)
        return
      }

      router.push('/admin/arbitros')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar')
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      '¿Seguro que quieres borrar este árbitro? Los partidos quedarán sin árbitro.'
    )
    if (!ok) return

    setDeleting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/referee-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo borrar')
        setDeleting(false)
        return
      }

      router.push('/admin/arbitros')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo borrar')
      setDeleting(false)
    }
  }

  if (!referee) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 900,
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

      <h1 style={{ marginTop: 0, marginBottom: 18 }}>Editar árbitro</h1>

      <form
        onSubmit={handleSave}
        style={{
          border: '1px solid #ddd',
          borderRadius: 18,
          background: '#fff',
          padding: 18,
          boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
          marginBottom: 20,
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

        <div style={{ display: 'grid', gap: 10 }}>
          <button
            type="submit"
            disabled={saving}
            style={btnGreen}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={btnRed}
          >
            {deleting ? 'Borrando...' : 'Borrar árbitro'}
          </button>
        </div>
      </form>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 18,
          background: '#fff',
          padding: 18,
          boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 14 }}>Partidos asignados</h2>

        {enrichedMatches.length === 0 && (
          <div>No tiene partidos asignados.</div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {enrichedMatches.map((m) => (
            <div
              key={m.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 'bold' }}>
                {m.teamAName} vs {m.teamBName}
              </div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                {phaseLabel(m.phase)} · {m.sportName} · {m.match_time || 'Sin horario'}
              </div>
              <a
                href={`/admin/partidos/${m.id}`}
                style={{
                  display: 'inline-block',
                  marginTop: 10,
                  padding: '8px 10px',
                  background: '#111827',
                  color: 'white',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: 14,
                }}
              >
                Editar partido
              </a>
            </div>
          ))}
        </div>
      </div>
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

const btnRed = {
  width: '100%',
  padding: 14,
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: 12,
  fontWeight: 'bold',
  fontSize: 16,
  cursor: 'pointer',
}