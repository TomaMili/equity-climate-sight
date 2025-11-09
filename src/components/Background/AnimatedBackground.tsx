export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Floating particles - Climate colors */}
      <div className="absolute top-20 left-16 w-3 h-3 bg-[hsl(var(--success))] opacity-20 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
      <div className="absolute top-40 right-24 w-5 h-5 bg-[hsl(var(--cii-7))] opacity-15 rounded-full animate-bounce" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-32 left-20 w-4 h-4 bg-[hsl(var(--air-good))] opacity-25 rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-16 right-32 w-2 h-2 bg-[hsl(var(--warning))] opacity-20 rounded-full animate-ping" style={{ animationDelay: '4s' }} />
      <div className="absolute top-1/3 left-1/3 w-3 h-3 bg-[hsl(var(--cii-9))] opacity-15 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-2/3 right-1/3 w-4 h-4 bg-[hsl(var(--success))] opacity-20 rounded-full animate-bounce" style={{ animationDelay: '2.5s' }} />
      <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-[hsl(var(--cii-7))] opacity-25 rounded-full animate-ping" style={{ animationDelay: '1.5s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-3 h-3 bg-[hsl(var(--air-good))] opacity-15 rounded-full animate-pulse" style={{ animationDelay: '3.5s' }} />

      {/* Large gradient orbs */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-[hsl(var(--cii-2))]/15 to-transparent rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-tl from-[hsl(var(--cii-7))]/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-[hsl(var(--success))]/10 to-[hsl(var(--cii-9))]/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
}
