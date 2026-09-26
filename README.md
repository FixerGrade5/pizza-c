# Pizza Companies - Buffet Ordering System

โปรเจกต์ระบบสั่งอาหารบุฟเฟต์ร้าน Pizza Companies (สุกี้ตี๋ใหญ่) พัฒนาด้วย Next.js App Router (JavaScript) และ Supabase

## 📌 ข้อมูลตารางฐานข้อมูล Supabase (Reference Only)

1. **`sessions`**
   - `id`: primary key
   - `table_number`: เลขโต๊ะ
   - `adult_count`: จำนวนผู้ใหญ่
   - `child_count`: จำนวนเด็ก
   - `status`: สถานะโต๊ะ (เช่น active, closed)
   - `created_at`: เวลาที่เปิดโต๊ะ

2. **`menu_categories`**
   - `id`: primary key
   - `name`: ชื่อหมวดหมู่
   - `sort_order`: ลำดับการแสดงผล

3. **`menu_items`**
   - `id`: primary key
   - `category_id`: foreign key อ้างอิง menu_categories
   - `name`: ชื่อเมนูอาหาร

4. **`orders`**
   - `id`: primary key
   - `session_id`: foreign key อ้างอิง sessions
   - `table_number`: เลขโต๊ะ
   - `items`: jsonb (รายการอาหารที่สั่ง)
   - `status`: สถานะออเดอร์ (เช่น pending, cooking, served)
   - `created_at`: เวลาที่สั่ง

---

## ⚠️ ข้อควรจำสำคัญเกี่ยวกับ Next.js เวอร์ชันล่าสุด (App Router)

โปรเจกต์นี้ใช้ **Next.js เวอร์ชัน 15+** 

ใน **Client Components (`'use client'`)** ของ Dynamic Routes (เช่น `app/table/[sessionId]/page.js`):
- ค่า `params` ถูกเปลี่ยนไปส่งค่ามาเป็น **Promise**
- ต้องทำการ unwrap ค่าด้วยฟังก์ชัน `use()` จาก React เสมอ

### ตัวอย่างการใช้งาน `params` ใน Dynamic Route:
```javascript
'use client';

import { use } from 'react';

export default function OrderPage({ params }) {
  // Unwrap params ที่เป็น Promise ด้วย React.use()
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  return <div>Session ID: {sessionId}</div>;
}
