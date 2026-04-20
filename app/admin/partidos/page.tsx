'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getTeam(teams: any[], id: number) {
  return teams.find((t) => t.id === id) || null
}

function getTeamName(teams: any[], id: number) {
  return getTeam(teams, id)?.name || '—'
}

function getSportName(sports: any[], id: number) {
  const sport = sports.find((s) => s.id === id)
  return sport?.display_name || sport?.name || '—'
}

function getRefereeName(referees: any[], id: string | null) {
  if (!id) return '—'
  return referees.find((r) => r.profile_id === id)?.name || '—'
}

function getStatusLabel(match: any) {
  if (match.status === 'cancelled') return 'CANCELADO'
  if (match.status === 'submitted') return 'CAPTURADO'
  if (match.started_at) return 'EN JUEGO'
  return 'PENDIENTE'
}

function getStatusStyle(match: any) {
  if (match.status === 'cancelled') {
    return { background: '#fee2e2', color: '#991b1b' }
  }
  if (match.status === 'submitted') {
    return { background: '#d1fae5', color: '#065f46' }
  }
  if (match.started_at) {
    return { background: '#dbeafe', color: '#1d4ed8' }
  }
  return { background: '#fef3c7', color: '#92400e' }
}

function TeamMini({ team }: { team: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {team?.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.name}
          style={{
            width: 26,
            height: 26,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : null}
      <span>{team?.name || '—'}</span>
    </div>
  )
}

export default function AdminPartidosPage() {
  const [matches, setMatches] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [sports, setSports] = useState<any[]>([])
  const [referees, setReferees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [resettingAll, setResettingAll] = useState(false)

  const [teamFilter, setTeamFilter] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  async function loadData() {
    const { data: m } = await supabase.from('matches').select('*')
    const { data: t } = await supabase.from('teams').select('*').order('name')
    const { data: s } = await supabase.from('Sports').select('*')
    const { data: r } = await supabase.from('referees').select('*')

    setMatches(m || [])
    setTeams(t || [])
    setSports(s || [])
    setReferees(r || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const teamMatch =
        !teamFilter ||
        String(m.team_a_id) === teamFilter ||
        String(m.team_b_id) === teamFilter

      const sportMatch = !sportFilter || String(m.sport_id) === sportFilter
      const phaseMatch = !phaseFilter || String(m.phase) === phaseFilter

      const computedStatus =
        m.status === 'cancelled'
          ? 'cancelled'
          : m.status === 'submitted'
          ? 'submitted'
          : m.started_at
          ? 'live'
          : 'pending'

      const statusMatch = !statusFilter || computedStatus === statusFilter

      return teamMatch && sportMatch && phaseMatch && statusMatch
    })
  }, [matches, teamFilter, sportFilter, phaseFilter, statusFilter])

  async function handleResetAllTournament() {
    const ok1 = window.confirm(
      '¿Seguro que quieres reiniciar TODO el torneo?\n\nSe borrarán marcadores, resultados, temporizadores, estados y notas de TODOS los partidos.'
    )
    if (!ok1) return

    const confirmation = window.prompt(
      'Para continuar escribe: REINICIAR'
    )

    if (!confirmation || confirmation.trim().toUpperCase() !== 'REINICIAR') {
      alert('Acción cancelada.')
      return
    }

    setResettingAll(true)

    try {
      const res = await fetch('/api/admin/matches-reset-all', {
        method: 'POST',
      })

      const result = await res.json()

      if (!res.ok) {
        alert(result.error || 'No se pudo reiniciar el torneo')
        setResettingAll(false)
        return
      }

      alert('El torneo fue reiniciado correctamente.')
      await loadData()
      setResettingAll(false)
    } catch (err: any) {
      alert(err?.message || 'No se pudo reiniciar el torneo')
      setResettingAll(false)
    }
  }

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 1200,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <a
        href="/admin"
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
        ← Admin
      </a>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 30 }}>Admin · Partidos</h1>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleResetAllTournament}
            disabled={resettingAll}
            style={{
              padding: '10px 14px',
              background: '#dc2626',
              color: 'white',
              borderRadius: 12,
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {resettingAll ? 'Reiniciando...' : 'Reiniciar torneo'}
          </button>

          <Link
            href="/admin/partidos/nuevo"
            style={{
              display: 'inline-block',
              padding: '10px 14px',
              background: '#059669',
              color: 'white',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 'bold',
            }}
          >
            + Crear partido
          </Link>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 18,
          border: '1px solid #ddd',
          borderRadius: 18,
          padding: 14,
          background: '#f7f7f7',
        }}
      >
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}
        >
          <option value="">Todos los equipos</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}
        >
          <option value="">Todos los deportes</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name || s.name}
            </option>
          ))}
        </select>

        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}
        >
          <option value="">Todas las fases</option>
          <option value="regular">Regular</option>
          <option value="quarterfinal">Cuartos</option>
          <option value="semifinal">Semifinal</option>
          <option value="final">Final</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}
        >
          <option value="">Todos los status</option>
          <option value="pending">Pendiente</option>
          <option value="live">En juego</option>
          <option value="submitted">Capturado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {filteredMatches.map((m) => {
          const style = getStatusStyle(m)
          const teamA = getTeam(teams, m.team_a_id)
          const teamB = getTeam(teams, m.team_b_id)

          return (
            <div
              key={m.id}
              style={{
                padding: 16,
                border: '1px solid #ddd',
                borderRadius: 16,
                background: '#fff',
                boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      alignItems: 'center',
                      gap: 10,
                      fontWeight: 'bold',
                      fontSize: 18,
                    }}
                  >
                    <TeamMini team={teamA} />
                    <div>vs</div>
                    <div style={{ justifySelf: 'end' }}>
                      <TeamMini team={teamB} />
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
                    {m.phase} · {getSportName(sports, m.sport_id)} · {m.match_time || 'Sin horario'}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    Árbitro: {getRefereeName(referees, m.referee_id)}
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 'bold', fontSize: 20 }}>
                    {m.live_score_a ?? 0} - {m.live_score_b ?? 0}
                    {m.status === 'submitted' && (
                      <span style={{ marginLeft: 10, fontSize: 14 }}>
                        (final {m.score_a ?? 0} - {m.score_b ?? 0})
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      ...style,
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 'bold',
                      marginBottom: 10,
                    }}
                  >
                    {getStatusLabel(m)}
                  </div>

                  <div>
                    <Link
                      href={`/admin/partidos/${m.id}`}
                      style={{
                        display: 'inline-block',
                        padding: '10px 12px',
                        background: '#111827',
                        color: 'white',
                        borderRadius: 10,
                        textDecoration: 'none',
                        fontWeight: 'bold',
                      }}
                    >
                      Editar
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {filteredMatches.length === 0 && (
          <div
            style={{
              padding: 16,
              border: '1px solid #ddd',
              borderRadius: 12,
              background: '#fafafa',
            }}
          >
            No hay partidos con esos filtros.
          </div>
        )}
      </div>
    </main>
  )
}