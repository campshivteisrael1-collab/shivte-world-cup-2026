'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

export default function AdminDeportesPage() {
  const [sports, setSports] = useState<any[]>([])
  const [referees, setReferees] = useState<any[]>([])
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
        setErrorMsg(json?.error || 'Error cargando deportes')
        setLoading(false)
        return
      }

      setSports(json.sports || [])
      setReferees(json.referees || [])
      setLoading(false)
    }

    load()
  }, [])

  function getRefereesForSport(sportId: number | string) {
    const sportReferees = referees.filter(
      (referee) =>
        String(referee.sport_id || '') === String(sportId || '') &&
        referee.is_active !== false
    )

    if (sportReferees.length === 0) return 'Sin asignar'

    return sportReferees
      .map((referee) => referee.name || referee.username)
      .join(', ')
  }

  const filteredSports = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sports

    return sports.filter((sport) => {
      const refereesDisplay = getRefereesForSport(sport.id).toLowerCase()

      return (
        String(sport.name || '').toLowerCase().includes(q) ||
        String(sport.display_name || '').toLowerCase().includes(q) ||
        String(sport.location || '').toLowerCase().includes(q) ||
        String(sport.rules || '').toLowerCase().includes(q) ||
        refereesDisplay.includes(q)
      )
    })
  }, [sports, search, referees])

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
        <h1 style={{ margin: 0, fontSize: 30 }}>Admin · Deportes</h1>

        <Link
          href="/admin/deportes/nuevo"
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
          + Crear deporte
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
          placeholder="Buscar por nombre, ubicación, árbitros o reglas"
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
            fontWeight: 'bold',
          }}
        >
          {errorMsg}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {filteredSports.map((sport) => (
          <div
            key={sport.id}
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
              {sport.display_name || sport.name}
            </div>

            <p style={{ margin: '8px 0', lineHeight: 1.4 }}>
              <strong>Nombre interno:</strong> {sport.name || '—'}
            </p>

            <p style={{ margin: '8px 0', lineHeight: 1.4 }}>
              <strong>Ubicación:</strong> {sport.location || '—'}
            </p>

            <p style={{ margin: '8px 0', lineHeight: 1.4 }}>
              <strong>Árbitro asignado:</strong>{' '}
              {getRefereesForSport(sport.id)}
            </p>

            <p style={{ margin: '8px 0', lineHeight: 1.45 }}>
              <strong>Reglas:</strong> {sport.rules || '—'}
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
                href={`/admin/deportes/${sport.id}`}
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