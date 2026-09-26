'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // ดึงรายการออเดอร์ทั้งหมด
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  // อัปเดตสถานะออเดอร์ (เช่น pending -> cooking -> served)
  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert(`ไม่สามารถอัปเดตสถานะได้: ${error.message}`);
    } else {
      fetchOrders();
    }
  };

  useEffect(() => {
    fetchOrders();

    // ตั้งค่า Supabase Realtime ฟังการเปลี่ยนแปลงตาราง orders
    const channel = supabase
      .channel('realtime_kitchen_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Order change received:', payload);
          fetchOrders(); // ดึงข้อมูลใหม่เมื่อมีการ insert/update ออเดอร์
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>ห้องครัว (Kitchen Display System)</h1>
        <button
          onClick={fetchOrders}
          style={{ padding: '0.5rem 1rem', background: '#666', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          🔄 โหลดข้อมูลใหม่
        </button>
      </div>

      {loading ? (
        <p>กำลังโหลดรายการออเดอร์...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '1rem',
                background: order.status === 'pending' ? '#fff9e6' : order.status === 'cooking' ? '#e6f7ff' : '#f5f5f5',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>โต๊ะ {order.table_number}</span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  {new Date(order.created_at).toLocaleTimeString('th-TH')}
                </span>
              </div>

              {/* แสดงรายการอาหารจาก JSONB */}
              <div style={{ margin: '1rem 0' }}>
                <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                  {Array.isArray(order.items) ? (
                    order.items.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>
                        <strong>{item.name}</strong> x {item.quantity || 1}
                      </li>
                    ))
                  ) : (
                    <li>ไม่มีข้อมูลรายการอาหาร</li>
                  )}
                </ul>
              </div>

              {/* ปุ่มเปลี่ยนสถานะ */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'cooking')}
                    style={{ flex: 1, padding: '0.5rem', background: '#ff9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    กำลังทำ (Cooking)
                  </button>
                )}
                {order.status === 'cooking' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'served')}
                    style={{ flex: 1, padding: '0.5rem', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    เสิร์ฟแล้ว (Served)
                  </button>
                )}
                <span
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: '#ccc',
                    alignSelf: 'center',
                  }}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <p style={{ color: '#999', gridColumn: '1 / -1' }}>ยังไม่มีรายการออเดอร์ส่งเข้ามา</p>
          )}
        </div>
      )}
    </div>
  );
}
