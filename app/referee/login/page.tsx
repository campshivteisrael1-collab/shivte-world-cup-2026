'use client'

import { useState } from 'react'

export default function RefereeHomePage() {
  const [headerOk, setHeaderOk] = useState(true)

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 920,
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
            src="/header-referee.png"
            alt="Referee"
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
            Referee
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <a href="/" style={pillBlack}>← Inicio</a>
        <a href="/tabla#clasificacion-general" style={pillGreen}>Ver tabla general</a>
      </div>

      <h1 style={{ marginTop: 0 }}>Panel de árbitro</h1>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 18,
          padding: 18,
          background: '#fff',
        }}
      >
        Aquí va tu panel de árbitro.
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