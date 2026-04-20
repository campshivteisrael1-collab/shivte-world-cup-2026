'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function NuevoPartidoPage() {
  const router = useRouter()

  const [teams, setTeams] = useState<any[]>([])
  const [sports, setSports] = useState<any[]>([])
  const [referees, setReferees] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<any>({
    team_a_id: '',
    team_b_id: '',
    sport_id: '',
    match_time: '',
    phase: 'regular',
    referee_id: '',
    live_score_a: 0,
    live_score_b: 0,
    status: null,
  })

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('teams').select('*').order('name')
      const { data: s } = await supabase.from('Sports').select('*')
      const { data: r } = await supabase.from('referees').select('*').order('name')

      setTeams(t || [])
      setSports(s || [])
      setReferees(r || [])
    }

    load()
  }, [])

  async function save() {
    setSaving(true)

    await supabase.from('matches').insert({
      team_a_id: Number(form.team_a_id),
      team_b_id: Number(form.team_b_id),
      sport_id: Number(form.sport_id),
      match_time: form.match_time || null,
      phase: form.phase,
      referee_id: form.referee_id || null,
      live_score_a: Number(form.live_score_a ?? 0),
      live_score_b: Number(form.live_score_b ?? 0),
      status: form.status || null,
    })

    router.push('/admin/partidos')
    router.refresh()
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
        href="/admin/partidos"
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
        ← Admin Partidos
      </a>

      <h1 style={{ marginTop: 0, marginBottom: 18 }}>Crear partido</h1>

      <div
        style={{
          display: 'grid',
          gap: 12,
          border: '1px solid #ddd',
          borderRadius: 18,
          background: '#fff',
          padding: 18,
          boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
        }}
      >
        <label>
          <strong>Equipo A</strong>
          <select
            onChange={(e) => setForm({ ...form, team_a_id: e.target.value })}
            style={input}
            value={form.team_a_id}
          >
            <option value="">Selecciona equipo A</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <strong>Equipo B</strong>
          <select
            onChange={(e) => setForm({ ...form, team_b_id: e.target.value })}
            style={input}
            value={form.team_b_id}
          >
            <option value="">Selecciona equipo B</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <strong>Deporte</strong>
          <select
            onChange={(e) => setForm({ ...form, sport_id: e.target.value })}
            style={input}
            value={form.sport_id}
          >
            <option value="">Selecciona deporte</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name || s.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <strong>Fase</strong>
          <select
            onChange={(e) => setForm({ ...form, phase: e.target.value })}
            style={input}
            value={form.phase}
          >
            <option value="regular">regular</option>
            <option value="quarterfinal">quarterfinal</option>
            <option value="semifinal">semifinal</option>
            <option value="final">final</option>
          </select>
        </label>

        <label>
          <strong>Horario</strong>
          <input
            placeholder="Ej. 10:40 a.m. - 11:00 a.m."
            onChange={(e) => setForm({ ...form, match_time: e.target.value })}
            style={input}
            value={form.match_time}
          />
        </label>

        <label>
          <strong>Árbitro</strong>
          <select
            onChange={(e) => setForm({ ...form, referee_id: e.target.value })}
            style={input}
            value={form.referee_id}
          >
            <option value="">Sin árbitro</option>
            {referees.map((r) => (
              <option key={r.profile_id} value={r.profile_id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <button onClick={save} disabled={saving} style={btnGreen}>
          {saving ? 'Guardando...' : 'Guardar partido'}
        </button>
      </div>
    </main>
  )
}

const input = {
  width: '100%',
  padding: 12,
  marginTop: 6,
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