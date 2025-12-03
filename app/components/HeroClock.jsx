"use client";

import { useEffect, useState } from "react";

export default function HeroClock() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-8">
      <span className="font-mono text-3xl md:text-4xl font-semibold tracking-widest text-emerald-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]">
        {now
          ? now.toLocaleTimeString("es-CL", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            })
          : "--:--:--"}
      </span>
    </div>
  );
}
