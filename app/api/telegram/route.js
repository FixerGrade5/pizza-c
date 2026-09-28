import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { message } = await request.json();

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn('Telegram Notification Skip: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return NextResponse.json(
        { error: 'Telegram configuration is missing in environment variables' },
        { status: 500 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // ยิง API ไปยัง Telegram จากฝั่ง Node.js Server
    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const result = await telegramRes.json();

    if (!result.ok) {
      console.error('Telegram API Response Error:', result);
      return NextResponse.json({ error: result.description }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Internal Server Error in /api/telegram:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
