'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)

    await fetch('/api/admin/logout', {
      method: 'POST',
    })

    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        padding: '10px 14px',
        background: '#111827',
        color: 'white',
        borderRadius: 12,
        border: 'none',
        fontWeight: 'bold',
        cursor: 'pointer',
      }}
    >
      {loading ? 'Saliendo...' : 'Cerrar sesión'}
    </button>
  )
}