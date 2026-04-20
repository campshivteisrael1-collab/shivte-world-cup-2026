import Link from 'next/link'

export default function HomeButton() {
  return (
    <Link
      href="/"
      style={{
        display: 'inline-block',
        marginBottom: 16,
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
    </Link>
  )
}