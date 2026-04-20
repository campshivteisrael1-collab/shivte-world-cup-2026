'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)

    await fetch('/api/logout', {
      method: 'POST',
    })

    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        padding: '10px 14px',
        background: '#111',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
      }}
    >
      {loading ? 'Saliendo...' : 'Cerrar sesión'}
    </button>
  )
}