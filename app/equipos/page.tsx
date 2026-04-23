'use client'

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EquiposPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('teams')
        .select('*')
        .order('name')

      setTeams(data || [])
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
              {team.logo_url && (
                <img
                  src={team.logo_url}
                  style={{ maxWidth: 70, maxHeight: 70 }}
                />
              )}
            </div>

            {team.name}
          </Link>
        ))}
      </div>
    </main>
  )
}