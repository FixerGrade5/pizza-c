import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Pizza Companies</h1>
      <p style={{ color: '#666' }}>ระบบสั่งอาหารร้าน Pizza</p>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <Link 
          href="/generate-qr" 
          style={{ padding: '0.75rem 1.5rem', background: '#0070f3', color: '#fff', borderRadius: '5px', textDecoration: 'none' }}
        >
          ไปหน้า Generate QR Code
        </Link>
        <Link 
          href="/kitchen" 
          style={{ padding: '0.75rem 1.5rem', background: '#28a745', color: '#fff', borderRadius: '5px', textDecoration: 'none' }}
        >
          ไปหน้าห้องครัว (Kitchen)
        </Link>
      </div>
    </main>
  );
}
