'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

export default function AdminArbitrosPage() {
  const [referees, setReferees] = useState<any[]>([])
  const [sports, setSports] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setErrorMsg('')

      const res = await fetch('/api/admin/referees-list', {
        cache: 'no-store',
      })

      const json = await res.json()

      if (!res.ok) {
        setErrorMsg(json?.error || 'Error cargando árbitros')
        setLoading(false)
        return
      }

      setReferees(json.referees || [])
      setSports(json.sports || [])
      setMatches(json.matches || [])
      setLoading(false)
    }

    load()
  }, [])

  const filteredReferees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return referees

    return referees.filter((r) => {
      const sportName = getSportName(r.sport_id).toLowerCase()

      return (
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.username || '').toLowerCase().includes(q) ||
        sportName.includes(q)
      )
    })
  }, [referees, search, sports])

  function getSportName(sportId: number | string | null) {
    if (!sportId) return 'Sin deporte'

    const sport = sports.find((s) => String(s.id) === String(sportId))

    return sport?.display_name || sport?.name || 'Sin deporte'
  }

  function matchCount(referee: any) {
    return matches.filter((m) => {
      return (
        String(m.referee_id || '') === String(referee.id || '') ||
        String(m.referee_id || '') === String(referee.profile_id || '')
      )
    }).length
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
          placeholder="Buscar por nombre, usuario o deporte"
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 12,
            border: '1px solid #ccc',
            fontSize: 15,
          }}
        />
      </div>

      {errorMsg && (
        <div
          style={{
            border: '1px solid #fecaca',
            borderRadius: 18,
            background: '#fef2f2',
            padding: 18,
            color: '#991b1b',
            marginBottom: 18,
          }}
        >
          {errorMsg}
        </div>
      )}

      {filteredReferees.length === 0 ? (
        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: 18,
            background: '#fff',
            padding: 18,
            color: '#555',
          }}
        >
          No hay árbitros para mostrar.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: 16,
          }}
        >
          {filteredReferees.map((referee) => (
            <div
              key={referee.id || referee.profile_id}
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
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'flex-start',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontWeight: 'bold',
                    fontSize: 22,
                    lineHeight: 1.15,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {referee.name || 'Sin nombre'}
                </div>

                <span
                  style={{
                    padding: '5px 9px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 'bold',
                    background:
                      referee.is_active === false ? '#fee2e2' : '#dcfce7',
                    color:
                      referee.is_active === false ? '#991b1b' : '#166534',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {referee.is_active === false ? 'Inactivo' : 'Activo'}
                </span>
              </div>

              <p style={{ margin: '8px 0', lineHeight: 1.4 }}>
                <strong>Usuario:</strong> {referee.username || '—'}
              </p>

              <p style={{ margin: '8px 0', lineHeight: 1.4 }}>
                <strong>Deporte:</strong> {getSportName(referee.sport_id)}
              </p>

              <p style={{ margin: '8px 0', lineHeight: 1.4 }}>
                <strong>Partidos asignados:</strong> {matchCount(referee)}
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
                  href={`/admin/arbitros/${referee.id || referee.profile_id}`}
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
      )}
    </main>
  )
}
