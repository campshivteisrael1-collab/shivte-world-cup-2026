'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)

    const res = await fetch('/api/admin/users-list', {
      cache: 'no-store',
    })

    const json = await res.json()

    setUsers(json.users || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return <main style={{ padding: 20 }}>Cargando...</main>
  }

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 900,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <a href="/" style={pillBlack}>← Inicio</a>
        <a href="/admin" style={pillBlack}>← Admin</a>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <h1 style={{ margin: 0 }}>Admin · Usuarios</h1>

        <Link
          href="/admin/usuarios/nuevo"
          style={{
            padding: '10px 14px',
            background: '#059669',
            color: 'white',
            borderRadius: 12,
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          + Crear usuario
        </Link>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {users.map((u) => (
          <div
            key={u.id}
            style={{
              padding: 14,
              border: '1px solid #ddd',
              borderRadius: 12,
              background: '#fff',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>
              {u.name}
            </div>

            <div style={{ fontSize: 13, color: '#666' }}>
              Usuario: {u.username}
            </div>

            <div style={{ marginTop: 8 }}>
              {u.is_super_admin ? (
                <span style={badgeGreen}>Admin general</span>
              ) : (
                <span style={badgeGray}>Admin</span>
              )}

              {!u.is_active && (
                <span style={badgeRed}>Inactivo</span>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <Link
                href={`/admin/usuarios/${u.id}`}
                style={{
                  padding: '8px 12px',
                  background: '#111827',
                  color: 'white',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 'bold',
                }}
              >
                Editar
              </Link>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div
            style={{
              padding: 16,
              border: '1px solid #ddd',
              borderRadius: 12,
              background: '#fafafa',
            }}
          >
            No hay usuarios.
          </div>
        )}
      </div>
    </main>
  )
}

const pillBlack = {
  padding: '8px 14px',
  background: '#111827',
  color: 'white',
  borderRadius: 999,
  textDecoration: 'none',
  fontWeight: 'bold',
}

const badgeGreen = {
  background: '#d1fae5',
  color: '#065f46',
  padding: '4px 8px',
  borderRadius: 999,
  fontSize: 12,
  marginRight: 6,
}

const badgeGray = {
  background: '#e5e7eb',
  color: '#111827',
  padding: '4px 8px',
  borderRadius: 999,
  fontSize: 12,
  marginRight: 6,
}

const badgeRed = {
  background: '#fee2e2',
  color: '#991b1b',
  padding: '4px 8px',
  borderRadius: 999,
  fontSize: 12,
}