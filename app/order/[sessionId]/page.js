'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // ปรับ path ตามการใช้งานจริงของคุณ

export default function OrderPage({ params }) {
  const { sessionId } = params;
  const [cart, setCart] = useState({});
  const [session, setSession] = useState({ id: sessionId, table_number: '1' });
  const [submitting, setSubmitting] = useState(false);

  // ฟังก์ชันยิงเข้า Route Handler
  const sendTelegramNotification = async (messageText) => {
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageText }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.warn('Telegram Route Error:', errorData);
      }
    } catch (err) {
      // ไม่ให้ขัดจังหวะระบบขายหากการยิง notification ล้มเหลว
      console.error('Failed to connect to /api/telegram:', err);
    }
  };

  // ฟังก์ชันขาย/ตัดสต๊อก
  const handleSubmitOrder = async () => {
    const cartItems = Object.values(cart);
    if (cartItems.length === 0) return;

    setSubmitting(true);

    try {
      const currentTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      const orderItemsPayload = [];

      for (const item of cartItems) {
        // 1. ดึงสต๊อกปัจจุบัน
        const { data: currentItem, error: fetchErr } = await supabase
          .from('menu_items')
          .select('stock, price')
          .eq('id', item.id)
          .single();

        if (fetchErr || !currentItem) {
          throw new Error(`ไม่สามารถดึงข้อมูลสต๊อกของ ${item.name} ได้`);
        }

        const newStock = (currentItem.stock || 0) - item.quantity;
        if (newStock < 0) {
          throw new Error(`สินค้า ${item.name} มีจำนวนไม่พอ (คงเหลือ ${currentItem.stock || 0} ชิ้น)`);
        }

        // 2. ตัดสต๊อกใน Supabase
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

        // -------------------------------------------------------------
        // งานที่ 1: แจ้งเตือน Order เข้า (New Order Alert)
        // -------------------------------------------------------------
        const newOrderMessage = 
`🛍️ <b>มีรายการขายใหม่! (โต๊ะ ${session.table_number})</b>
- สินค้า: ${item.name}
- จำนวน: ${item.quantity} ชิ้น
- ราคารวม: ${totalPrice.toLocaleString()} บาท
- สต๊อกคงเหลือปัจจุบัน: ${newStock} ชิ้น
- เวลา: ${currentTime}`;

        await sendTelegramNotification(newOrderMessage);

        // -------------------------------------------------------------
        // งานที่ 2: แจ้งเตือน Stock เหลือน้อย (Low Stock Alert <= 5)
        // -------------------------------------------------------------
        if (newStock <= 5) {
          const lowStockMessage = 
`🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>
- สินค้า: ${item.name}
- คงเหลือเพียง: ${newStock} ชิ้น
⚠️ กรุณาเติมสต๊อกสินค้าด่วน!`;

          await sendTelegramNotification(lowStockMessage);
        }
      }

      // 3. บันทึกออเดอร์
      const { error: orderErr } = await supabase.from('orders').insert([
        {
          session_id: session.id,
          table_number: session.table_number,
          items: orderItemsPayload,
          status: 'pending',
        },
      ]);

      if (orderErr) {
        throw new Error(`บันทึกออเดอร์ไม่สำเร็จ: ${orderErr.message}`);
      }

      alert('ทำรายการสั่งซื้อเรียบร้อยแล้ว!');
      setCart({});

    } catch (err) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">ระบบสั่งอาหาร โต๊ะ {session.table_number}</h1>
      <button
        onClick={handleSubmitOrder}
        disabled={submitting}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {submitting ? 'กำลังดำเนินการ...' : 'ยืนยันการสั่งซื้อ'}
      </button>
    </div>
  );
}
