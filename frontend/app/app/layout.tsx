import React from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-full overflow-hidden p-0 md:p-2.5 flex items-center justify-center bg-gradient-to-br from-[#d7e4ff] via-[#e5ecfb] to-[#cbdcfa]">
      <style>{`
        body {
          background: #d7e4ff !important;
          overflow: hidden !important;
          height: 100dvh !important;
        }
      `}</style>
      {children}
    </div>
  );
}
