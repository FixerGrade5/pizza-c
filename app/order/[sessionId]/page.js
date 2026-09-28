'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ตรวจสอบ path ให้ตรงกับโครงสร้างโปรเจกต์ของคุณ

export default function OrderPage({ params }) {
  const { sessionId } = params;
  
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState({});
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // 1. ดึงข้อมูล Session, หมวดหมู่ และรายการเมนูจาก Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // ดึงข้อมูล Session/โต๊ะ
        const { data: sessionData, error: sessionErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();

        if (sessionErr) console.error('Error fetching session:', sessionErr);
        else setSession(sessionData);

        // ดึงข้อมูลหมวดหมู่
        const { data: catData, error: catErr } = await supabase
          .from('menu_categories')
          .select('*')
          .order('id');

        if (catErr) console.error('Error fetching categories:', catErr);
        else setCategories(catData || []);

        // ดึงรายการเมนู
        const { data: itemData, error: itemErr } = await supabase
          .from('menu_items')
          .select('*')
          .order('id');

        if (itemErr) console.error('Error fetching menu items:', itemErr);
        else setMenuItems(itemData || []);

      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchData();
    }
  }, [sessionId]);

  // ฟังก์ชันยิงแจ้งเตือนไปที่ /api/telegram
  const sendTelegramNotification = async (messageText) => {
    try {
      await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });
    } catch (err) {
      console.error('Failed to send Telegram notification:', err);
    }
  };

  // ระบบตะกร้าสินค้า (+ / -)
  const addToCart = (item) => {
    if (item.stock <= 0) return;
    
    setCart((prev) => {
      const currentQty = prev[item.id]?.quantity || 0;
      if (currentQty >= item.stock) {
        alert(`สินค้า ${item.name} มีสต๊อกคงเหลือเพียง ${item.stock} ชิ้น`);
        return prev;
      }
      return {
        ...prev,
        [item.id]: {
          ...item,
          quantity: currentQty + 1,
        },
      };
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;

      if (existing.quantity === 1) {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      }

      return {
        ...prev,
        [itemId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  // ฟังก์ชันยืนยันการขาย / ตัดสต๊อก / ส่ง Telegram
  const handleSubmitOrder = async () => {
    const cartItems = Object.values(cart);
    if (cartItems.length === 0 || !session) return;

    setSubmitting(true);

    try {
      const currentTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      const orderItemsPayload = [];

      for (const item of cartItems) {
        // ดึงสต๊อกล่าสุดจาก Supabase (ใช้ maybeSingle และ log error เพื่อความแม่นยำ)
        const { data: currentItem, error: fetchErr } = await supabase
          .from('menu_items')
          .select('stock, price')
          .eq('id', item.id)
          .maybeSingle();

        if (fetchErr) {
          console.error('Supabase Fetch Error Details:', fetchErr);
          throw new Error(`เกิดข้อผิดพลาดจากฐานข้อมูล: ${fetchErr.message}`);
        }

        if (!currentItem) {
          console.error(`ไม่พบเมนู ID: "${item.id}" (${item.name}) ในตาราง menu_items`);
          throw new Error(`ไม่พบรายการสินค้า ${item.name} ในระบบ (ID: ${item.id})`);
        }

        const newStock = (currentItem.stock || 0) - item.quantity;
        if (newStock < 0) {
          throw new Error(`สินค้า ${item.name} มีสต๊อกไม่พอ (เหลือ ${currentItem.stock || 0} ชิ้น)`);
        }

        // ตัดสต๊อกใน Supabase
        const { error: updateErr } = await supabase
          .from('menu_items')
          .update({ stock: newStock })
          .eq('id', item.id);

        if (updateErr) {
          throw new Error(`อัปเดตสต๊อก ${item.name} ไม่สำเร็จ: ${updateErr.message}`);
        }

        const itemPrice = currentItem.price || 0;
        const totalPrice = itemPrice * item.quantity;

        orderItemsPayload.push({
          menu_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: itemPrice,
          remaining_stock: newStock,
        });

        // 1. ส่ง Telegram: รายการขายใหม่
        const newOrderMsg = 
`🛍️ <b>มีรายการขายใหม่! (โต๊ะ ${session.table_number || 1})</b>
- สินค้า: ${item.name}
- จำนวน: ${item.quantity} ชิ้น
- ราคารวม: ${totalPrice.toLocaleString()} บาท
- สต๊อกคงเหลือปัจจุบัน: ${newStock} ชิ้น
- เวลา: ${currentTime}`;

        await sendTelegramNotification(newOrderMsg);

        // 2. ส่ง Telegram: แจ้งเตือนสต๊อกเหลือน้อย (<= 5)
        if (newStock <= 5) {
          const lowStockMsg = 
`🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>
- สินค้า: ${item.name}
- คงเหลือเพียง: ${newStock} ชิ้น
⚠️ กรุณาเติมสต๊อกสินค้าด่วน!`;

          await sendTelegramNotification(lowStockMsg);
        }
      }

      // บันทึกลงตาราง orders
      const { error: orderErr } = await supabase.from('orders').insert([
        {
          session_id: session.id,
          table_number: session.table_number,
          items: orderItemsPayload,
          status: 'pending',
        },
      ]);

      if (orderErr) throw new Error(orderErr.message);

      // อัปเดต state หน้าร้านหลังขายสำเร็จ
      setMenuItems((prev) =>
        prev.map((m) => {
          const sold = cart[m.id];
          return sold ? { ...m, stock: m.stock - sold.quantity } : m;
        })
      );

      setOrderSuccess(true);
      setCart({});
      setTimeout(() => setOrderSuccess(false), 4000);

    } catch (err) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // กรองเมนูตามหมวดหมู่
  const filteredMenuItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter((item) => String(item.category_id) === String(selectedCategory));

  const totalCartPrice = Object.values(cart).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (loading) {
    return <div className="p-8 text-center text-gray-500">กำลังโหลดรายการอาหาร...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          ระบบสั่งอาหาร โต๊ะ {session?.table_number || '1'}
        </h1>
        {orderSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded">
            สั่งซื้อสำเร็จแล้ว!
          </div>
        )}
      </div>

      {/* Categories Bar */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition ${
            selectedCategory === 'all'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ทั้งหมด
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition ${
              String(selectedCategory) === String(cat.id)
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {filteredMenuItems.map((item) => {
          const inCartCount = cart[item.id]?.quantity || 0;
          const isOutOfStock = item.stock <= 0;

          return (
            <div
              key={item.id}
              className={`border rounded-lg p-4 shadow-sm bg-white flex flex-col justify-between ${
                isOutOfStock ? 'opacity-60 bg-gray-50' : ''
              }`}
            >
              <div>
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-36 object-cover rounded-md mb-3"
                  />
                )}
                <h3 className="font-semibold text-lg text-gray-800">{item.name}</h3>
                <p className="text-gray-500 text-sm mb-2">{item.description}</p>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-red-600 font-bold">{item.price} บาท</span>
                  <span className={isOutOfStock ? 'text-red-500' : 'text-gray-500'}>
                    {isOutOfStock ? 'สินค้าหมด' : `คงเหลือ ${item.stock} ชิ้น`}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t flex justify-between items-center">
                {inCartCount > 0 ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-8 h-8 rounded-full bg-gray-200 text-gray-800 font-bold hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span className="font-semibold px-2">{inCartCount}</span>
                    <button
                      onClick={() => addToCart(item)}
                      disabled={inCartCount >= item.stock}
                      className="w-8 h-8 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(item)}
                    disabled={isOutOfStock}
                    className="w-full py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:bg-gray-300 transition"
                  >
                    {isOutOfStock ? 'สินค้าหมด' : 'เพิ่มลงตะกร้า'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Summary Bar (Bottom Sticky) */}
      {Object.keys(cart).length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">ราคารวมทั้งหมด</p>
              <p className="text-xl font-bold text-red-600">
                {totalCartPrice.toLocaleString()} บาท
              </p>
            </div>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
            >
              {submitting ? 'กำลังส่งรายการ...' : 'ยืนยันการสั่งซื้อ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
