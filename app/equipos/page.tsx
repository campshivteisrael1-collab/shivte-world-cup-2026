'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EquiposPage() {
  const [view, setView] = useState<'partidos' | 'general'>('partidos')
  const [teams, setTeams] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .order('name')

      const { data: playersData } = await supabase
        .from('team_players')
        .select('*')
        .order('player_name')

      setTeams(teamsData || [])
      setPlayers(playersData || [])
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 980,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <a
        href="/"
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
        ← Inicio
      </a>

      <h1
        style={{
          marginTop: 0,
          marginBottom: 18,
          fontSize: 30,
          lineHeight: 1.1,
        }}
      >
        Equipos
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => setView('partidos')}
          style={{
            padding: '10px 16px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            background: view === 'partidos' ? '#111827' : '#e5e7eb',
            color: view === 'partidos' ? 'white' : 'black',
          }}
        >
          Partidos
        </button>

        <button
          onClick={() => setView('general')}
          style={{
            padding: '10px 16px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            background: view === 'general' ? '#111827' : '#e5e7eb',
            color: view === 'general' ? 'white' : 'black',
          }}
        >
          Equipos general
        </button>
      </div>

      {view === 'partidos' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 14,
          }}
        >
          {teams.map((team: any) => (
            <Link
              key={team.id}
              href={`/equipos/${team.id}`}
              style={{
                display: 'block',
                padding: 18,
                borderRadius: 18,
                border: '1px solid #ddd',
                background: '#f7f7f7',
                textDecoration: 'none',
                color: 'black',
                fontWeight: 'bold',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                fontSize: 17,
                lineHeight: 1.2,
                overflowWrap: 'anywhere',
              }}
            >
              <div
                style={{
                  height: 86,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    style={{
                      maxWidth: 70,
                      maxHeight: 70,
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: '50%',
                      background: '#e5e7eb',
                    }}
                  />
                )}
              </div>

              {team.name}
            </Link>
          ))}
        </div>
      )}

      {view === 'general' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {teams.map((team: any) => {
            const teamPlayers = players.filter((p: any) => p.team_id === team.id)

            return (
              <div
                key={team.id}
                style={{
                  borderRadius: 18,
                  padding: 16,
                  border: '1px solid #ddd',
                  background: '#f7f7f7',
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
                      background: '#fff',
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

                <p style={{ margin: '8px 0', lineHeight: 1.45 }}>
                  <strong>Director técnico:</strong>{' '}
                  {team.coach_name || 'Por asignar'}
                </p>

                <p style={{ margin: '8px 0', lineHeight: 1.5 }}>
                  <strong>Jugadores:</strong>{' '}
                  {teamPlayers.length > 0
                    ? teamPlayers.map((p: any) => p.player_name).join(', ')
                    : 'Por asignar'}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}