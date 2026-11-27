"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useGlTier } from "@/lib/client/effects";

const PrizeScene = dynamic(() => import("@/components/three/PrizeScene"), { ssr: false });

export function PrizeStage() {
  const ref = useRef<HTMLDivElement>(null);
  const tier = useGlTier();
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setNear(true);
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const use3d = (tier === "high" || tier === "low") && near;
  return (
    <div ref={ref} className="relative aspect-[16/11] w-full">
      {use3d ? (
        <PrizeScene tier={tier} running={visible} />
      ) : (
        <div aria-hidden className="absolute inset-0 grid place-items-center">
          <div className="relative aspect-[1.6] w-[78%] -rotate-6 border border-silver/40 bg-[linear-gradient(135deg,#c9ccd0,#8e9297_55%,#b9bcc0)] p-[5%] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)]">
            <div className="t-wordmark text-ink text-[clamp(1rem,2.4vw,1.6rem)]">EIC</div>
            <div className="absolute inset-x-0 bottom-[26%] h-[6%] bg-forest" />
            <div className="absolute bottom-[8%] left-[5%] t-num text-ink text-[clamp(2.5rem,7vw,5rem)] leading-none">$75</div>
            <div className="absolute right-[6%] top-[12%] h-[18%] w-[15%] bg-[#e7e9eb]" />
          </div>
        </div>
      )}
    </div>
  );
}
