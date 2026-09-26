'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function OrderPage({ params }) {
  // Unwrap params ที่เป็น Promise ตามหลักการ Next.js 15+ App Router
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  const [session, setSession] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // ตระกร้าสินค้า: Key เป็น menu_item_id ค่าเป็น object { item, quantity }
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // ดึงข้อมูล Session, หมวดหมู่ และ เมนูอาหาร
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. ดึงข้อมูล Session ปัจจุบัน
      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionErr || !sessionData) {
        console.error('Session not found:', sessionErr);
      } else {
        setSession(sessionData);
      }

      // 2. ดึงหมวดหมู่เมนู
      const { data: catData } = await supabase
        .from('menu_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (catData) setCategories(catData);

      // 3. ดึงรายการเมนูอาหารทั้งหมด
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*');

      if (menuData) setMenuItems(menuData);

      setLoading(false);
    }

    if (sessionId) {
      fetchData();
    }
  }, [sessionId]);

  // ฟังก์ชันเพิ่มจำนวนเมนูในตะกร้า
  const addToCart = (item) => {
    setCart((prev) => {
      const currentQty = prev[item.id]?.quantity || 0;
      return {
        ...prev,
        [item.id]: {
          id: item.id,
          name: item.name,
          quantity: currentQty + 1,
        },
      };
    });
  };

  // ฟังก์ชันลดจำนวนเมนูในตะกร้า
  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const currentQty = prev[itemId]?.quantity || 0;
      if (currentQty <= 1) {
        const newCart = { ...prev };
        delete newCart[itemId];
        return newCart;
      }
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          quantity: currentQty - 1,
        },
      };
    });
  };

  // จำนวนรายการอาหารทั้งหมดในตะกร้า
  const totalCartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  // ฟังก์ชันส่งออเดอร์เข้า Supabase
  const handleSubmitOrder = async () => {
    if (totalCartCount === 0 || !session) return;

    setSubmitting(true);

    const orderItemsPayload = Object.values(cart).map((item) => ({
      menu_id: item.id,
      name: item.name,
      quantity: item.quantity,
    }));

    const { error } = await supabase.from('orders').insert([
      {
        session_id: session.id,
        table_number: session.table_number,
        items: orderItemsPayload, // บันทึกแบบ JSONB
        status: 'pending',
      },
    ]);

    setSubmitting(false);

    if (error) {
      alert(`ไม่สามารถส่งออเดอร์ได้: ${error.message}`);
    } else {
      setOrderSuccess(true);
      setCart({});
      setTimeout(() => setOrderSuccess(false), 4000); // ซ่อนข้อความแจ้งเตือนหลัง 4 วินาที
    }
  };

  // กรองเมนูอาหารตามหมวดหมู่ที่เลือก
  const filteredMenuItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter((item) => item.category_id === Number(selectedCategory));

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>กำลังโหลดเมนู...</div>;
  }

  if (!session) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>
        <h2>ไม่พบข้อมูลโต๊ะหรือ Session นี้เปิดอยู่อีกต่อไป</h2>
        <p>กรุณาสแกน QR Code ใหม่อีกครั้ง</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', paddingBottom: '100px', maxWidth: '600px', margin: '0 auto', background: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* Header แสดงข้อมูลโต๊ะ */}
      <header style={{ background: '#d32f2f', color: '#fff', padding: '1rem', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Pizza Companies</h1>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
          โต๊ะ: <strong>{session.table_number}</strong> | ผู้ใหญ่ {session.adult_count} คน, เด็ก {session.child_count} คน
        </p>
      </header>

      {/* แจ้งเตือนเมื่อส่งออเดอร์สำเร็จ */}
      {orderSuccess && (
        <div style={{ background: '#4caf50', color: '#fff', padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
          ส่งรายการสั่งอาหารเข้าห้องครัวเรียบร้อยแล้ว!
        </div>
      )}

      {/* แถบเลือกหมวดหมู่เมนู */}
      <div style={{ display: 'flex', overflowX: 'auto', padding: '0.75rem', gap: '0.5rem', background: '#fff', borderBottom: '1px solid #e0e0e0' }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            border: 'none',
            whiteSpace: 'nowrap',
            background: selectedCategory === 'all' ? '#d32f2f' : '#e0e0e0',
            color: selectedCategory === 'all' ? '#fff' : '#333',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          ทั้งหมด
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              border: 'none',
              whiteSpace: 'nowrap',
              background: selectedCategory === cat.id ? '#d32f2f' : '#e0e0e0',
              color: selectedCategory === cat.id ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* รายการเมนูอาหาร */}
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {filteredMenuItems.map((item) => {
            const qtyInCart = cart[item.id]?.quantity || 0;

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fff',
                  padding: '1rem',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontWeight: '500', fontSize: '1rem' }}>{item.name}</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {qtyInCart > 0 ? (
                    <>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: '1px solid #d32f2f',
                          background: '#fff',
                          color: '#d32f2f',
                          fontSize: '1.2rem',
                          cursor: 'pointer',
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{qtyInCart}</span>
                      <button
                        onClick={() => addToCart(item)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: 'none',
                          background: '#d32f2f',
                          color: '#fff',
                          fontSize: '1.2rem',
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => addToCart(item)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#d32f2f',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      เลือก
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredMenuItems.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999', marginTop: '2rem' }}>ไม่มีรายการอาหารในหมวดหมู่นี้</p>
          )}
        </div>
      </div>

      {/* แถบด้านล่างสำหรับส่งออเดอร์ (แสดงเมื่อมีของในตะกร้า) */}
      {totalCartCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#fff',
            padding: '1rem',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '600px',
            margin: '0 auto',
            zIndex: 100,
          }}
        >
          <div>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>รายการที่เลือกทั้งหมด:</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#d32f2f' }}>{totalCartCount} รายการ</div>
          </div>

          <button
            onClick={handleSubmitOrder}
            disabled={submitting}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'กำลังส่ง...' : 'ยืนยันสั่งอาหาร'}
          </button>
        </div>
      )}
    </div>
  );
}
