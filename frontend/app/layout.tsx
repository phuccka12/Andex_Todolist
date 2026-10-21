import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cao Bảo Phúc (CBP) — Full-Stack Developer & Andex OS',
  description: 'Portfolio & Operating System: I build digital products that people love. Andex OS, Gemini AI Scheduling & Flow State Productivity.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen w-full bg-white text-slate-900 overflow-x-hidden selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
