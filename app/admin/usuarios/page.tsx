export default function AdminUsuariosPage() {
  return (
    <main
      style={{
        padding: 16,
        maxWidth: 900,
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <a
          href="/"
          style={{
            display: 'inline-block',
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

        <a
          href="/admin"
          style={{
            display: 'inline-block',
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

        <a
          href="/tabla#clasificacion-general"
          style={{
            display: 'inline-block',
            padding: '8px 14px',
            background: '#0f766e',
            color: 'white',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: 14,
          }}
        >
          Ver tabla general
        </a>
      </div>

      <h1 style={{ marginTop: 0 }}>Admin · Usuarios</h1>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 18,
          padding: 18,
          background: '#fff',
        }}
      >
        Aquí dejé la base del panel de usuarios admin.
      </div>
    </main>
  )
}