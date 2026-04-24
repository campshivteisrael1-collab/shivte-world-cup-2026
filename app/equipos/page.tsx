'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function EquiposPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      const res = await fetch('/api/admin/teams-list', {
        cache: 'no-store',
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json?.error || 'No se pudieron cargar los equipos')
        setLoading(false)
        return
      }

      setTeams(json.teams || [])
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
        }}
      >
        Equipos
      </h1>

      {error && (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: '#fee2e2',
            color: '#991b1b',
            fontWeight: 'bold',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {teams.length === 0 && !error ? (
        <div
          style={{
            borderRadius: 18,
            padding: 18,
            background: '#f7f7f7',
            border: '1px solid #ddd',
          }}
        >
          No hay equipos para mostrar.
        </div>
      ) : (
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
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              <div
                style={{
                  height: 80,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
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
                    }}
                  />
                ) : null}
              </div>

              {team.name}
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}