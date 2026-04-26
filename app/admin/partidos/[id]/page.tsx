'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getOfficialDisplayMatch } from '../../../../lib/knockout'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function isKnockoutPhase(phase: string) {
  return phase === 'quarterfinal' || phase === 'semifinal' || phase === 'final'
}

function getTeam(teams: any[], id: number) {
  return teams.find((team) => String(team.id) === String(id)) || null
}

function TeamMini({ team }: { team: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {team?.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.name || team.team || 'Equipo'}
          style={{
            width: 34,
            height: 34,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : null}
      <strong>{team?.name || team?.team || '—'}</strong>
    </div>
  )
}

export default function EditMatchPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params?.id as string

  const [match, setMatch] = useState<any>(null)
  const [allMatches, setAllMatches] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [sports, setSports] = useState<any[]>([])
  const [referees, setReferees] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    const { data: m } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    const { data: allM } = await supabase.from('matches').select('*')
    const { data: t } = await supabase.from('teams').select('*').order('name')
    const { data: s } = await supabase.from('Sports').select('*')
    const { data: r } = await supabase.from('referees').select('*').order('name')

    setMatch(m)
    setAllMatches(allM || [])
    setTeams(t || [])
    setSports(s || [])
    setReferees(r || [])
  }

  useEffect(() => {
    if (matchId) load()
  }, [matchId])

  const displayMatch = useMemo(() => {
    if (!match) return null
    return getOfficialDisplayMatch(match, allMatches, teams)
  }, [match, allMatches, teams])

  const displayTeamA =
    displayMatch?._team_a_display ||
    getTeam(teams, displayMatch?.team_a_id)

  const displayTeamB =
    displayMatch?._team_b_display ||
    getTeam(teams, displayMatch?.team_b_id)

  async function postAction(action: 'save' | 'reset' | 'clearFinal' | 'cancel') {
    try {
      setError('')
      setSuccess('')

      if (action === 'save') {
        setSaving(true)
      } else {
        setWorking(true)
      }

      const res = await fetch('/api/admin/match-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          matchId: match.id,
          payload: match,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'No se pudo guardar')
        setSaving(false)
        setWorking(false)
        return false
      }

      setSuccess(result.message || 'Operación realizada correctamente')
      setSaving(false)
      setWorking(false)
      return true
    } catch (e: any) {
      setError(e?.message || 'No se pudo completar la acción')
      setSaving(false)
      setWorking(false)
      return false
    }
  }

  async function save() {
    const ok = await postAction('save')
    if (!ok) return
    alert('Guardado')
    router.refresh()
    await load()
  }

  async function resetMatch() {
    const okConfirm = window.confirm('¿Seguro que quieres reiniciar este partido?')
    if (!okConfirm) return

    const ok = await postAction('reset')
    if (!ok) return

    alert('Partido reiniciado')
    location.reload()
  }

  async function clearFinalResult() {
    const okConfirm = window.confirm('¿Seguro que quieres borrar el resultado final?')
    if (!okConfirm) return

    const ok = await postAction('clearFinal')
    if (!ok) return

    alert('Resultado final borrado')
    location.reload()
  }

  async function cancelMatch() {
    const okConfirm = window.confirm('¿Seguro que quieres cancelar este partido?')
    if (!okConfirm) return

    const ok = await postAction('cancel')
    if (!ok) return

    alert('Partido cancelado')
    location.reload()
  }

  if (!match) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  const isKnockout = isKnockoutPhase(match.phase)

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

      {isKnockout && (
        <div
          style={{
            marginBottom: 16,
            padding: 16,
            borderRadius: 18,
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 10 }}>
            Cruce oficial calculado por tabla
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: 12,
              fontSize: 18,
            }}
          >
            <TeamMini team={displayTeamA} />
            <strong>vs</strong>
            <div style={{ justifySelf: 'end' }}>
              <TeamMini team={displayTeamB} />
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color: '#1d4ed8' }}>
            En eliminatorias los equipos se muestran según la lógica oficial de
            clasificación. No se editan manualmente aquí.
          </div>
        </div>
      )}

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
        {!isKnockout && (
          <>
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
          </>
        )}

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
            onChange={(e) =>
              setMatch({ ...match, referee_id: e.target.value || null })
            }
            style={input}
          >
            <option value="">Sin árbitro</option>
            {referees
              .filter((r) => r.is_active !== false)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.username || 'Árbitro sin nombre'}
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
              onChange={(e) => setMatch({ ...match, score_a: e.target.value })}
              style={input}
            />
          </label>

          <label>
            <strong>Final score B</strong>
            <input
              type="number"
              value={match.score_b ?? ''}
              onChange={(e) => setMatch({ ...match, score_b: e.target.value })}
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
          <p style={{ color: 'red', fontWeight: 'bold', margin: 0 }}>{error}</p>
        )}

        {success && (
          <p style={{ color: '#166534', fontWeight: 'bold', margin: 0 }}>
            {success}
          </p>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          <button onClick={save} disabled={saving} style={btnGreen}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>

          <button onClick={resetMatch} disabled={working} style={btnDark}>
            {working ? 'Procesando...' : 'Reiniciar partido completo'}
          </button>

          <button onClick={clearFinalResult} disabled={working} style={btnOrange}>
            {working ? 'Procesando...' : 'Borrar resultado final'}
          </button>

          <button onClick={cancelMatch} disabled={working} style={btnRed}>
            {working ? 'Procesando...' : 'Cancelar partido'}
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
} as const

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
} as const

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
} as const

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
} as const

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
} as const