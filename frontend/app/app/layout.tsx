import React from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh w-full overflow-hidden flex bg-[#F8FAFC]">
      <style>{`
        body {
          overflow: hidden !important;
          height: 100dvh !important;
        }
      `}</style>
      {children}
    </div>
  );
}
