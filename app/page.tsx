import Link from 'next/link'

export default function HomePage() {
  const items = [
    {
      title: 'Tabla',
      description: 'Calendario, posiciones generales y fase de eliminación.',
      href: '/tabla',
      bg: 'linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)',
    },
    {
      title: 'Equipos',
      description: 'Consulta partidos, descansos, DT y jugadores de cada equipo.',
      href: '/equipos',
      bg: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    },
    {
      title: 'Árbitros',
      description: 'Acceso al sistema de captura de resultados y control de partidos.',
      href: '/login',
      bg: 'linear-gradient(135deg, #111827 0%, #4b5563 100%)',
    },
    {
      title: 'Admin',
      description: 'Panel de control general del torneo.',
      href: '/admin',
      bg: 'linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)',
    },
  ]

  return (
    <main
      style={{
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        background:
          'linear-gradient(180deg, #0b1220 0%, #0f2f6d 30%, #f3f4f6 70%, #ffffff 100%)',
        padding: '20px 14px 48px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <section
          style={{
            background:
              'linear-gradient(135deg, #0f172a 0%, #1d4ed8 60%, #38bdf8 100%)',
            color: 'white',
            borderRadius: 28,
            padding: '24px 18px',
            boxShadow: '0 18px 44px rgba(0,0,0,0.25)',
            marginBottom: 22,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 18,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  opacity: 0.92,
                  marginBottom: 8,
                }}
              >
                Shivte World Cup 2026
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(30px, 6vw, 52px)',
                  lineHeight: 1.02,
                }}
              >
                Centro de control del torneo
              </h1>

              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  maxWidth: 760,
                  fontSize: 'clamp(15px, 3.5vw, 18px)',
                  opacity: 0.96,
                  lineHeight: 1.45,
                }}
              >
                Accede a la tabla general, equipos, captura de árbitros y panel administrativo desde un solo lugar.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 24,
                  padding: 14,
                  backdropFilter: 'blur(6px)',
                  boxShadow: '0 14px 34px rgba(0,0,0,0.18)',
                }}
              >
                <img
                  src="/logo-shivte-2026.png"
                  alt="Shivte World Cup 2026"
                  style={{
                    width: 'min(100%, 280px)',
                    display: 'block',
                    borderRadius: 18,
                    objectFit: 'contain',
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              style={{
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <div
                style={{
                  borderRadius: 22,
                  padding: 20,
                  minHeight: 170,
                  background: item.bg,
                  boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 'clamp(24px, 5vw, 30px)',
                      fontWeight: 'bold',
                      marginBottom: 10,
                      lineHeight: 1.1,
                    }}
                  >
                    {item.title}
                  </div>

                  <div
                    style={{
                      fontSize: 'clamp(14px, 3.5vw, 15px)',
                      lineHeight: 1.45,
                      opacity: 0.95,
                    }}
                  >
                    {item.description}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    fontWeight: 'bold',
                    fontSize: 14,
                    opacity: 0.95,
                  }}
                >
                  Entrar →
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}