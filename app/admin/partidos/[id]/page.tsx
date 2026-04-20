'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EditMatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const matchId = resolvedParams.id

  const [match, setMatch] = useState<any>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [sports, setSports] = useState<any[]>([])
  const [referees, setReferees] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: m } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      const { data: t } = await supabase.from('teams').select('*').order('name')
      const { data: s } = await supabase.from('Sports').select('*')
      const { data: r } = await supabase.from('referees').select('*').order('name')

      setMatch(m)
      setTeams(t || [])
      setSports(s || [])
      setReferees(r || [])
    }

    load()
  }, [matchId])

  async function save() {
    setSaving(true)
    setError('')

    const payload = {
      ...match,
      team_a_id: Number(match.team_a_id),
      team_b_id: Number(match.team_b_id),
      sport_id: Number(match.sport_id),
      live_score_a: Number(match.live_score_a ?? 0),
      live_score_b: Number(match.live_score_b ?? 0),
      score_a:
        match.score_a === '' || match.score_a === null
          ? null
          : Number(match.score_a),
      score_b:
        match.score_b === '' || match.score_b === null
          ? null
          : Number(match.score_b),
      referee_id: match.referee_id || null,
      referee_note: match.referee_note || null,
      started_at: match.started_at || null,
      ended_at: match.ended_at || null,
    }

    const { error } = await supabase
      .from('matches')
      .update(payload)
      .eq('id', match.id)

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    alert('Guardado')
    router.refresh()
  }

  async function resetMatch() {
    const ok = window.confirm('¿Seguro que quieres reiniciar este partido?')
    if (!ok) return

    const { error } = await supabase
      .from('matches')
      .update({
        live_score_a: 0,
        live_score_b: 0,
        score_a: null,
        score_b: null,
        status: null,
        started_at: null,
        ended_at: null,
        referee_note: null,
      })
      .eq('id', match.id)

    if (error) {
      setError(error.message)
      return
    }

    alert('Partido reiniciado')
    location.reload()
  }

  async function clearFinalResult() {
    const ok = window.confirm('¿Seguro que quieres borrar el resultado final?')
    if (!ok) return

    const { error } = await supabase
      .from('matches')
      .update({
        score_a: null,
        score_b: null,
        status: null,
        ended_at: null,
      })
      .eq('id', match.id)

    if (error) {
      setError(error.message)
      return
    }

    alert('Resultado final borrado')
    location.reload()
  }

  async function cancelMatch() {
    const ok = window.confirm('¿Seguro que quieres cancelar este partido?')
    if (!ok) return

    const { error } = await supabase
      .from('matches')
      .update({
        status: 'cancelled',
      })
      .eq('id', match.id)

    if (error) {
      setError(error.message)
      return
    }

    alert('Partido cancelado')
    location.reload()
  }

  if (!match) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 850,
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

      <h1 style={{ marginTop: 0, marginBottom: 18 }}>Editar partido</h1>

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
            value={match.team_a_id}
            onChange={(e) =>
              setMatch({ ...match, team_a_id: Number(e.target.value) })
            }
            style={input}
          >
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
            value={match.team_b_id}
            onChange={(e) =>
              setMatch({ ...match, team_b_id: Number(e.target.value) })
            }
            style={input}
          >
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
            value={match.sport_id}
            onChange={(e) =>
              setMatch({ ...match, sport_id: Number(e.target.value) })
            }
            style={input}
          >
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
            value={match.phase}
            onChange={(e) => setMatch({ ...match, phase: e.target.value })}
            style={input}
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
            value={match.match_time || ''}
            onChange={(e) => setMatch({ ...match, match_time: e.target.value })}
            style={input}
          />
        </label>

        <label>
          <strong>Árbitro</strong>
          <select
            value={match.referee_id || ''}
            onChange={(e) => setMatch({ ...match, referee_id: e.target.value || null })}
            style={input}
          >
            <option value="">Sin árbitro</option>
            {referees.map((r) => (
              <option key={r.profile_id} value={r.profile_id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          <label>
            <strong>Live score A</strong>
            <input
              type="number"
              value={match.live_score_a ?? 0}
              onChange={(e) =>
                setMatch({ ...match, live_score_a: Number(e.target.value) })
              }
              style={input}
            />
          </label>

          <label>
            <strong>Live score B</strong>
            <input
              type="number"
              value={match.live_score_b ?? 0}
              onChange={(e) =>
                setMatch({ ...match, live_score_b: Number(e.target.value) })
              }
              style={input}
            />
          </label>

          <label>
            <strong>Final score A</strong>
            <input
              type="number"
              value={match.score_a ?? ''}
              onChange={(e) =>
                setMatch({ ...match, score_a: e.target.value })
              }
              style={input}
            />
          </label>

          <label>
            <strong>Final score B</strong>
            <input
              type="number"
              value={match.score_b ?? ''}
              onChange={(e) =>
                setMatch({ ...match, score_b: e.target.value })
              }
              style={input}
            />
          </label>
        </div>

        <label>
          <strong>Status</strong>
          <select
            value={match.status || ''}
            onChange={(e) => setMatch({ ...match, status: e.target.value || null })}
            style={input}
          >
            <option value="">pending</option>
            <option value="submitted">submitted</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>

        <label>
          <strong>Started at</strong>
          <input
            value={match.started_at || ''}
            onChange={(e) => setMatch({ ...match, started_at: e.target.value })}
            style={input}
            placeholder="ISO string o vacío"
          />
        </label>

        <label>
          <strong>Ended at</strong>
          <input
            value={match.ended_at || ''}
            onChange={(e) => setMatch({ ...match, ended_at: e.target.value })}
            style={input}
            placeholder="ISO string o vacío"
          />
        </label>

        <label>
          <strong>Nota del árbitro</strong>
          <textarea
            value={match.referee_note || ''}
            onChange={(e) =>
              setMatch({ ...match, referee_note: e.target.value })
            }
            rows={5}
            style={{
              ...input,
              resize: 'vertical',
              fontFamily: 'Arial, sans-serif',
            }}
          />
        </label>

        {error && (
          <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          <button onClick={save} disabled={saving} style={btnGreen}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>

          <button onClick={resetMatch} style={btnDark}>
            Reiniciar partido completo
          </button>

          <button onClick={clearFinalResult} style={btnOrange}>
            Borrar resultado final
          </button>

          <button onClick={cancelMatch} style={btnRed}>
            Cancelar partido
          </button>
        </div>
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

const btnDark = {
  width: '100%',
  padding: 14,
  background: '#111827',
  color: 'white',
  border: 'none',
  borderRadius: 12,
  fontWeight: 'bold',
  fontSize: 16,
  cursor: 'pointer',
}

const btnOrange = {
  width: '100%',
  padding: 14,
  background: '#f59e0b',
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