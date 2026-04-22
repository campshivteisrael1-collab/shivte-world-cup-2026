'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminEquiposPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [headerOk, setHeaderOk] = useState(true)

  async function load() {
    setLoading(true)

    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    const { data: playersData } = await supabase
      .from('team_players')
      .select('*')

    setTeams(teamsData || [])
    setPlayers(playersData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teams

    return teams.filter((team) => {
      const playerNames = players
        .filter((p) => p.team_id === team.id)
        .map((p) => String(p.player_name || '').toLowerCase())
        .join(' ')

      return (
        String(team.name || '').toLowerCase().includes(q) ||
        String(team.coach_name || '').toLowerCase().includes(q) ||
        playerNames.includes(q)
      )
    })
  }, [teams, players, search])

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 1100,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          borderRadius: 22,
          overflow: 'hidden',
          marginBottom: 16,
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          background: '#111827',
          color: 'white',
        }}
      >
        {headerOk ? (
          <img
            src="/header-equipos.png"
            alt="Equipos"
            style={{
              width: '100%',
              height: 120,
              objectFit: 'cover',
              display: 'block',
            }}
            onError={() => setHeaderOk(false)}
          />
        ) : (
          <div style={{ padding: 24, fontSize: 28, fontWeight: 'bold' }}>
            Equipos
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <a href="/" style={pillBlack}>← Inicio</a>
        <a href="/admin" style={pillBlack}>← Admin</a>
        <a href="/tabla#clasificacion-general" style={pillGreen}>Ver tabla general</a>
      </div>

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
        <h1 style={{ margin: 0, fontSize: 30 }}>Admin · Equipos</h1>

        <Link
          href="/admin/equipos/nuevo"
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
          + Crear equipo
        </Link>
      </div>

      <div
        style={{
          marginBottom: 18,
          border: '1px solid #ddd',
          borderRadius: 16,
          background: '#f7f7f7',
          padding: 14,
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por equipo, DT o jugador"
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 12,
            border: '1px solid #ccc',
            fontSize: 15,
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
          gap: 16,
        }}
      >
        {filteredTeams.map((team) => {
          const teamPlayers = players.filter((p) => p.team_id === team.id)

          return (
            <div
              key={team.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 18,
                background: '#fff',
                padding: 16,
                boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 14,
                    background: '#f8fafc',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      style={{
                        maxWidth: 46,
                        maxHeight: 46,
                        objectFit: 'contain',
                        display: 'block',
                      }}
                    />
                  ) : null}
                </div>

                <div
                  style={{
                    fontWeight: 'bold',
                    fontSize: 22,
                    lineHeight: 1.15,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {team.name}
                </div>
              </div>

              <p style={{ margin: '8px 0', lineHeight: 1.4 }}>
                <strong>Director técnico:</strong>{' '}
                {team.coach_name || 'Por asignar'}
              </p>

              <p style={{ margin: '8px 0', lineHeight: 1.45 }}>
                <strong>Jugadores:</strong>{' '}
                {teamPlayers.length > 0
                  ? teamPlayers.map((p) => p.player_name).join(', ')
                  : 'Por asignar'}
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: 14,
                }}
              >
                <Link
                  href={`/admin/equipos/${team.id}`}
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

                <Link
                  href={`/admin/equipos/${team.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '10px 12px',
                    background: '#e5e7eb',
                    color: 'black',
                    borderRadius: 10,
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  }}
                >
                  Gestionar
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}

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