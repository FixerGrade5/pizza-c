'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function GenerateQRPage() {
  const [tableNumber, setTableNumber] = useState('');
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [message, setMessage] = useState('');

  // ดึงรายการ sessions ที่กำลังใช้งานอยู่ (status = 'active')
  const fetchActiveSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
    } else {
      setSessions(data || []);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  // สร้าง Session ใหม่เมื่อเปิดโต๊ะ
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!tableNumber) return;

    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          table_number: tableNumber,
          adult_count: parseInt(adultCount),
          child_count: parseInt(childCount),
          status: 'active',
        },
      ])
      .select();

    setLoading(false);

    if (error) {
      setMessage(`เกิดข้อผิดพลาด: ${error.message}`);
    } else if (data && data.length > 0) {
      setCurrentSession(data[0]);
      setMessage(`เปิดโต๊ะ ${tableNumber} เรียบร้อยแล้ว!`);
      setTableNumber('');
      setAdultCount(1);
      setChildCount(0);
      fetchActiveSessions();
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>ระบบเปิดโต๊ะ & สร้าง QR Code</h1>
      <p style={{ color: '#666' }}>Pizza Companies (สุกี้ตี๋ใหญ่)</p>

      {/* ฟอร์มเปิดโต๊ะ */}
      <form onSubmit={handleCreateSession} style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3>เปิดโต๊ะใหม่</h3>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>หมายเลขโต๊ะ:</label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="เช่น T-01"
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>ผู้ใหญ่ (คน):</label>
            <input
              type="number"
              min="1"
              value={adultCount}
              onChange={(e) => setAdultCount(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>เด็ก (คน):</label>
            <input
              type="number"
              min="0"
              value={childCount}
              onChange={(e) => setChildCount(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'กำลังบันทึก...' : 'สร้าง QR Code สั่งอาหาร'}
        </button>
      </form>

      {message && <p style={{ fontWeight: 'bold', color: message.includes('ผิดพลาด') ? 'red' : 'green' }}>{message}</p>}

      {/* แสดง QR Code ของโต๊ะล่าสุดที่เพิ่งเปิด */}
      {currentSession && (
        <div style={{ textAlign: 'center', border: '2px dashed #0070f3', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h2>QR Code สำหรับสั่งอาหาร - โต๊ะ {currentSession.table_number}</h2>
          <p>สแกนเพื่อเข้าสู่หน้าสั่งอาหาร (Session ID: {currentSession.id})</p>
          <img
            src={`https://quickchart.io/qr?text=${encodeURIComponent(
              typeof window !== 'undefined' ? `${window.location.origin}/order/${currentSession.id}` : ''
            )}&size=200`}
            alt={`QR Code Table ${currentSession.table_number}`}
            style={{ border: '1px solid #ddd', padding: '8px', background: '#fff' }}
          />
          <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
            URL: {typeof window !== 'undefined' ? `${window.location.origin}/order/${currentSession.id}` : ''}
          </p>
        </div>
      )}

      {/* รายการโต๊ะที่กำลังใช้งานอยู่ */}
      <h3>รายการโต๊ะที่กำลังใช้งานอยู่ ({sessions.length})</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>โต๊ะ</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>ผู้ใหญ่</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>เด็ก</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>เวลาเปิดโต๊ะ</th>
            <th style={{ padding: '0.5rem', border: '1px solid #ccc' }}>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td style={{ padding: '0.5rem', border: '1px solid #ccc', fontWeight: 'bold' }}>{s.table_number}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>{s.adult_count}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>{s.child_count}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ccc' }}>{new Date(s.created_at).toLocaleTimeString('th-TH')}</td>
              <td style={{ padding: '0.5rem', border: '1px solid #ccc', color: 'green' }}>{s.status}</td>
            </tr>
          ))}
          {sessions.length === 0 && (
            <tr>
              <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>ยังไม่มีโต๊ะที่เปิดอยู่</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
