import React from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden p-1 sm:p-2 md:p-2.5 flex items-center justify-center bg-gradient-to-br from-[#d7e4ff] via-[#e5ecfb] to-[#cbdcfa]">
      <style>{`
        body {
          background: #d7e4ff !important;
          overflow: hidden !important;
          height: 100vh !important;
        }
      `}</style>
      {children}
    </div>
  );
}
