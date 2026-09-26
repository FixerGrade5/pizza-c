export const metadata = {
  title: 'Pizza Companies - ระบบสั่งอาหาร',
  description: 'ระบบสั่งอาหารร้านบุฟเฟต์ Pizza Companies / สุกี้ตี๋ใหญ่',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
