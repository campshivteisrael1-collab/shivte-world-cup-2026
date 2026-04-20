'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminEditarDeportePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const sportId = Number(resolvedParams.id)

  const [sport, setSport] = useState<any>(null)
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [location, setLocation] = useState('')
  const [refereesDisplay, setRefereesDisplay] = useState('')
  const [rules, setRules] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: sport } = await supabase
        .from('Sports')
        .select('*')
        .eq('id', sportId)
        .single()

      setSport(sport)
      setName(sport?.name || '')
      setDisplayName(sport?.display_name || '')
      setLocation(sport?.location || '')
      setRefereesDisplay(sport?.referees_display || '')
      setRules(sport?.rules || '')
      setLoading(false)
    }

    load()
  }, [sportId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/admin/sport-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sportId,
          name,
          display_name: displayName,
          location,
          referees_display: refereesDisplay,
          rules,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo guardar')
        setSaving(false)
        return
      }

      router.push('/admin/deportes')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar')
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      '¿Seguro que quieres borrar este deporte? Esto puede afectar partidos existentes.'
    )
    if (!ok) return

    setDeleting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/sport-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sportId }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo borrar')
        setDeleting(false)
        return
      }

      router.push('/admin/deportes')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'No se pudo borrar')
      setDeleting(false)
    }
  }

  if (loading || !sport) {
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
        href="/admin/deportes"
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
        ← Admin Deportes
      </a>

      <h1 style={{ marginTop: 0, marginBottom: 18 }}>Editar deporte</h1>

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
            Nombre interno
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
            Nombre visible
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            style={input}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>
            Ubicación
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={input}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>
            Árbitros visibles
          </label>
          <input
            value={refereesDisplay}
            onChange={(e) => setRefereesDisplay(e.target.value)}
            style={input}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>
            Reglas
          </label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={6}
            style={{
              ...input,
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
            {deleting ? 'Borrando...' : 'Borrar deporte'}
          </button>
        </div>
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