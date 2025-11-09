export default function AnimatedBackground() {
  // par “nasumičnih” trokuta – svatko ima poziciju, veličinu i tempo
  const triangles = [
    { left: "12%", top: "18%", size: 18, delay: 0.2, dur: 10 },
    { left: "28%", top: "36%", size: 14, delay: 1.1, dur: 12 },
    { left: "8%", top: "62%", size: 12, delay: 2.5, dur: 11 },
    { left: "42%", top: "22%", size: 16, delay: 0.8, dur: 13 },
    { left: "55%", top: "48%", size: 20, delay: 1.8, dur: 12 },
    { left: "72%", top: "30%", size: 14, delay: 0.4, dur: 9 },
    { left: "84%", top: "18%", size: 16, delay: 2.2, dur: 14 },
    { left: "82%", top: "66%", size: 18, delay: 1.6, dur: 12 },
    { left: "64%", top: "72%", size: 12, delay: 0.6, dur: 10 },
    { left: "34%", top: "74%", size: 16, delay: 2.8, dur: 11 },
    { left: "18%", top: "80%", size: 14, delay: 1.4, dur: 9 },
    { left: "48%", top: "86%", size: 12, delay: 2.0, dur: 10 },
    { left: "60%", top: "12%", size: 14, delay: 1.2, dur: 12 },
    { left: "90%", top: "42%", size: 18, delay: 0.9, dur: 13 },
  ];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* lokalne animacije */}
      <style>{`
        @keyframes floatY   { 0%{transform:translateY(0)} 50%{transform:translateY(-18px)} 100%{transform:translateY(0)} }
        @keyframes driftX   { 0%{transform:translateX(0)} 50%{transform:translateX(10px)} 100%{transform:translateX(0)} }
        @keyframes slowSpin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
      `}</style>

      {/* TROKUTI (umjesto kružića) */}
      {triangles.map((t, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: t.left,
            top: t.top,
            width: t.size,
            height: t.size,
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
            // gradijent u skladu s paletom (#1a704b, #4A9EFF, #de2d26)
            background: "linear-gradient(135deg, rgba(74,158,255,.85), rgba(222,45,38,.65))",
            opacity: 0.25,
            filter: "drop-shadow(0 0 10px rgba(74,158,255,.25))",
            animation: `floatY ${t.dur}s ease-in-out ${t.delay}s infinite,
                        driftX ${t.dur * 1.2}s ease-in-out ${t.delay / 2}s infinite,
                        slowSpin ${t.dur * 8}s linear ${t.delay}s infinite`,
            borderRadius: 4,
          }}
        />
      ))}

      {/* VELIKI “AURORA/FOG” ORBOVI – zadržani, usklađeni s paletom */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-[#4A9EFF33] to-transparent rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-tl from-[#de2d261a] to-transparent rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "0.8s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-[#1a704b1a] to-[#4A9EFF1a] rounded-full blur-2xl animate-pulse"
        style={{ animationDelay: "1.6s" }}
      />
    </div>
  );
}
