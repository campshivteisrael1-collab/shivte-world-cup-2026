'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminArbitrosPage() {
  const [referees, setReferees] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: r } = await supabase
        .from('referees')
        .select('*')
        .order('name')

      const { data: m } = await supabase
        .from('matches')
        .select('*')

      setReferees(r || [])
      setMatches(m || [])
      setLoading(false)
    }

    load()
  }, [])

  const filteredReferees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return referees

    return referees.filter((r) => {
      return (
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.username || '').toLowerCase().includes(q) ||
        String(r.profile_id || '').toLowerCase().includes(q)
      )
    })
  }, [referees, search])

  function matchCount(profileId: string) {
    return matches.filter((m) => m.referee_id === profileId).length
  }

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
        <h1 style={{ margin: 0, fontSize: 30 }}>Admin · Árbitros</h1>

        <Link
          href="/admin/arbitros/nuevo"
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
          + Crear árbitro
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
          placeholder="Buscar por nombre o usuario"
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
        {filteredReferees.map((referee) => (
          <div
            key={referee.profile_id}
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
                fontWeight: 'bold',
                fontSize: 22,
                marginBottom: 10,
                lineHeight: 1.15,
                overflowWrap: 'anywhere',
              }}
            >
              {referee.name}
            </div>

            <p style={{ margin: '8px 0', lineHeight: 1.4 }}>
              <strong>Usuario:</strong> {referee.username || '—'}
            </p>

            <p style={{ margin: '8px 0', lineHeight: 1.4 }}>
              <strong>Partidos asignados:</strong> {matchCount(referee.profile_id)}
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
                href={`/admin/arbitros/${referee.profile_id}`}
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
        ))}
      </div>
    </main>
  )
}