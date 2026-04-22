import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import AdminLogoutButton from './logout-button'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const cards = [
  {
    title: 'Resumen',
    description: 'Vista general del torneo y accesos rápidos.',
    href: '/admin',
    bg: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
  },
  {
    title: 'Equipos',
    description: 'Crear, editar y borrar equipos, DT y jugadores.',
    href: '/admin/equipos',
    bg: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
  },
  {
    title: 'Partidos',
    description: 'Editar partidos, horarios, marcadores y árbitros.',
    href: '/admin/partidos',
    bg: 'linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)',
  },
  {
    title: 'Árbitros',
    description: 'Crear árbitros y administrar usuarios y contraseñas.',
    href: '/admin/arbitros',
    bg: 'linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)',
  },
  {
    title: 'Deportes',
    description: 'Crear, editar y borrar deportes, reglas y ubicaciones.',
    href: '/admin/deportes',
    bg: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
  },
  {
    title: 'Usuarios',
    description: 'Panel de usuarios admin para accesos futuros.',
    href: '/admin/usuarios',
    bg: 'linear-gradient(135deg, #dc2626 0%, #fb7185 100%)',
  },
]

export default async function AdminHomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_session')?.value

  if (!token) {
    redirect('/admin/login')
  }

  const { data: session } = await supabase
    .from('admin_sessions')
    .select('admin_id')
    .eq('token', token)
    .single()

  if (!session) {
    redirect('/admin/login')
  }

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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <a
            href="/"
            style={{
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

          <AdminLogoutButton />
        </div>

        <section
          style={{
            background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
            color: 'white',
            borderRadius: 24,
            padding: '24px 18px',
            marginBottom: 22,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 36 }}>
            Panel de control
          </h1>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          {cards.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              style={{ textDecoration: 'none', color: 'white' }}
            >
              <div
                style={{
                  borderRadius: 22,
                  padding: 20,
                  minHeight: 160,
                  background: item.bg,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    {item.description}
                  </div>
                </div>

                <div style={{ fontWeight: 'bold' }}>
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