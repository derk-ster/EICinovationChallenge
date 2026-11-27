"use client";
/* eslint-disable react-hooks/immutability -- three.js objects (vectors, materials, geometries) are
   mutable by design; they are created once and only mutated inside the render loop, never during React render. */

import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { GlTier } from "@/lib/client/effects";
import { useMaterialKit } from "./materials";
import { StudioEnvironment } from "./StudioEnvironment";

/** A machined, brushed-metal gift card that tilts toward the cursor. */

function useCardFace() {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let disposed = false;
    let tex: THREE.CanvasTexture | null = null;
    const draw = async () => {
      await document.fonts?.ready;
      if (disposed) return;
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 640;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);
      const family = getComputedStyle(document.body).fontFamily;
      ctx.fillStyle = "#ffffff";
      ctx.font = `800 64px ${family}`;
      ctx.fillText("EIC", 70, 120);
      ctx.font = `500 30px ${family}`;
      ctx.fillText("Innovation Challenge", 70, 165);
      ctx.font = `640 210px ${family}`;
      ctx.fillText("$75", 60, 590);
      ctx.font = `500 30px ${family}`;
      ctx.textAlign = "right";
      ctx.fillText("Grand prize gift card", 954, 586);
      tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      setTexture(tex);
    };
    draw();
    return () => {
      disposed = true;
      tex?.dispose();
    };
  }, []);
  return texture;
}

function Card({ tier }: { tier: Exclude<GlTier, "none"> }) {
  const kit = useMaterialKit(tier);
  const ref = useRef<THREE.Group>(null);
  const face = useCardFace();
  const engrave = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1b1c1e", metalness: 0.6, roughness: 0.5, transparent: true }),
    [],
  );
  useEffect(() => {
    engrave.map = face;
    engrave.alphaMap = null;
    engrave.needsUpdate = true;
  }, [face, engrave]);

  useFrame((s, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = s.clock.elapsedTime;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.35 + s.pointer.x * 0.45 + Math.sin(t * 0.4) * 0.06, 3, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0.12 - s.pointer.y * 0.3, 3, dt);
    g.position.y = Math.sin(t * 0.8) * 0.06;
  });

  return (
    <group ref={ref}>
      <RoundedBox args={[3.4, 2.12, 0.07]} radius={0.03} smoothness={4} material={kit.steel} />
      <mesh material={kit.forest} position={[0, 0.14, 0.037]}>
        <boxGeometry args={[3.4, 0.12, 0.004]} />
      </mesh>
      <RoundedBox args={[0.5, 0.38, 0.02]} radius={0.04} position={[1.18, 0.6, 0.04]} material={kit.chrome} />
      {face && (
        <mesh material={engrave} position={[0, 0, 0.0365]}>
          <planeGeometry args={[3.4, 2.125]} />
        </mesh>
      )}
    </group>
  );
}

export default function PrizeScene({ tier, running }: { tier: Exclude<GlTier, "none">; running: boolean }) {
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={tier === "high" ? [1, 1.5] : 1}
      camera={{ position: [0, 0, 6.2], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
      aria-hidden
    >
      <StudioEnvironment />
      <directionalLight position={[3, 4, 5]} intensity={1.2} />
      <Card tier={tier} />
    </Canvas>
  );
}
