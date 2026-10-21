export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAFAFC] text-[#1E293B] antialiased">
      {children}
    </div>
  );
}
