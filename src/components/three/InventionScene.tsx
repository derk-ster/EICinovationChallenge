"use client";
/* eslint-disable react-hooks/immutability -- three.js objects (vectors, materials, geometries) are
   mutable by design; they are created once and only mutated inside the render loop, never during React render. */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import type { GlTier } from "@/lib/client/effects";
import { createGearGeometry, useMaterialKit, type MaterialKit } from "./materials";
import { StudioEnvironment } from "./StudioEnvironment";

/**
 * "The Invention" — the site's central sculpture.
 *
 * Fourteen machined parts float apart as an idea in pieces. As the visitor
 * scrolls, each part travels into place (plinth → frame → mechanism → core →
 * glass cap) and the finished object starts running: the gear turns and the
 * orbit ring spins. Construction lines fade once the form is complete.
 */

type V3 = [number, number, number];

interface PartDef {
  key: string;
  render: (kit: MaterialKit, gear: THREE.BufferGeometry) => React.ReactNode;
  assembled: { p: V3; r: V3 };
  scattered: { p: V3; r: V3 };
  /** Scroll-progress window in which this part travels into place. */
  window: [number, number];
  spin?: "gear" | "ring" | "ring2";
}

const strut = (kit: MaterialKit) => (
  <mesh material={kit.chrome}>
    <cylinderGeometry args={[0.028, 0.028, 1.56, 20]} />
  </mesh>
);
const bolt = (kit: MaterialKit) => (
  <mesh material={kit.chrome}>
    <cylinderGeometry args={[0.065, 0.065, 0.07, 6]} />
  </mesh>
);

const PARTS: PartDef[] = [
  {
    key: "base",
    render: (k) => <RoundedBox args={[2.5, 0.16, 2.5]} radius={0.035} smoothness={3} material={k.steel} />,
    assembled: { p: [0, -1.27, 0], r: [0, 0, 0] },
    scattered: { p: [1.3, -1.7, -2.6], r: [0.55, 0.4, -0.25] },
    window: [0.04, 0.3],
  },
  {
    key: "plinth",
    render: (k) => <RoundedBox args={[1.72, 0.14, 1.72]} radius={0.03} smoothness={3} material={k.graphite} />,
    assembled: { p: [0, -1.12, 0], r: [0, Math.PI / 4, 0] },
    scattered: { p: [2.3, -1.2, -0.4], r: [-0.5, 0.8, 0.7] },
    window: [0.09, 0.34],
  },
  { key: "strut-a", render: strut, assembled: { p: [0.5, -0.27, 0.5], r: [0, 0, 0] }, scattered: { p: [-2.7, 0.9, 0.4], r: [0.4, 0, 1.2] }, window: [0.16, 0.42] },
  { key: "strut-b", render: strut, assembled: { p: [-0.5, -0.27, 0.5], r: [0, 0, 0] }, scattered: { p: [2.5, 1.65, -1.2], r: [-0.3, 0, -0.9] }, window: [0.19, 0.45] },
  { key: "strut-c", render: strut, assembled: { p: [0.5, -0.27, -0.5], r: [0, 0, 0] }, scattered: { p: [-0.9, 2.15, -1.8], r: [1.2, 0, 0.5] }, window: [0.22, 0.48] },
  { key: "strut-d", render: strut, assembled: { p: [-0.5, -0.27, -0.5], r: [0, 0, 0] }, scattered: { p: [1.25, -2.25, 1.4], r: [0.2, 0, 1.4] }, window: [0.25, 0.5] },
  {
    key: "gear",
    render: (k, gear) => <mesh geometry={gear} material={k.steel} />,
    assembled: { p: [0, -0.62, 0], r: [0, 0, 0] },
    scattered: { p: [-2.15, -0.65, 1.2], r: [1.2, 0.2, 0.6] },
    window: [0.3, 0.56],
    spin: "gear",
  },
  {
    key: "deck",
    render: (k) => (
      <mesh material={k.forest}>
        <cylinderGeometry args={[0.84, 0.84, 0.07, 72]} />
      </mesh>
    ),
    assembled: { p: [0, 0.52, 0], r: [0, 0, 0] },
    scattered: { p: [2.05, 0.2, -0.4], r: [1.1, 0, -0.7] },
    window: [0.38, 0.62],
  },
  { key: "bolt-a", render: bolt, assembled: { p: [1.08, -1.16, 1.08], r: [0, 0, 0] }, scattered: { p: [-3.0, -1.5, 0.2], r: [1, 0.5, 0] }, window: [0.44, 0.66] },
  { key: "bolt-b", render: bolt, assembled: { p: [-1.08, -1.16, 1.08], r: [0, 0, 0] }, scattered: { p: [3.0, -0.4, 1.0], r: [0.4, 1, 0.3] }, window: [0.46, 0.68] },
  { key: "bolt-c", render: bolt, assembled: { p: [1.08, -1.16, -1.08], r: [0, 0, 0] }, scattered: { p: [-0.4, -2.45, 0.5], r: [0.7, 0.2, 1.1] }, window: [0.48, 0.7] },
  { key: "bolt-d", render: bolt, assembled: { p: [-1.08, -1.16, -1.08], r: [0, 0, 0] }, scattered: { p: [0.95, 2.65, -0.6], r: [1.3, 0.6, 0.2] }, window: [0.5, 0.72] },
  {
    key: "core",
    render: (k) => (
      <mesh material={k.chrome}>
        <sphereGeometry args={[0.4, 64, 64]} />
      </mesh>
    ),
    assembled: { p: [0, 1.0, 0], r: [0, 0, 0] },
    scattered: { p: [0.15, 0.35, 0.9], r: [0, 0, 0] },
    window: [0.52, 0.77],
  },
  {
    key: "ring",
    render: (k) => (
      <mesh material={k.chrome}>
        <torusGeometry args={[0.7, 0.022, 20, 128]} />
      </mesh>
    ),
    assembled: { p: [0, 1.0, 0], r: [Math.PI / 2.35, 0, 0.32] },
    scattered: { p: [0.15, 0.35, 0.9], r: [1.25, 0.45, 0.2] },
    window: [0.55, 0.8],
    spin: "ring",
  },
  {
    key: "ring2",
    render: (k) => (
      <mesh material={k.steel}>
        <torusGeometry args={[0.56, 0.016, 16, 96]} />
      </mesh>
    ),
    assembled: { p: [0, 1.0, 0], r: [Math.PI / 2, 0.62, 0] },
    scattered: { p: [-1.05, 1.45, 0.9], r: [0.3, 1.0, 0.6] },
    window: [0.58, 0.83],
    spin: "ring2",
  },
  {
    key: "cap",
    render: (k) => (
      <mesh material={k.glass} scale={[1, 1.45, 1]}>
        <octahedronGeometry args={[0.3, 0]} />
      </mesh>
    ),
    assembled: { p: [0, 1.82, 0], r: [0, Math.PI / 4, 0] },
    scattered: { p: [1.55, 2.0, 0.9], r: [0.5, 0.5, 0.3] },
    window: [0.62, 0.88],
  },
];

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function Part({
  def,
  index,
  kit,
  gear,
  progress,
  intro,
}: {
  def: PartDef;
  index: number;
  kit: MaterialKit;
  gear: THREE.BufferGeometry;
  progress: RefObject<number>;
  intro: RefObject<number>;
}) {
  const ref = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const data = useMemo(() => {
    const qa = new THREE.Quaternion().setFromEuler(new THREE.Euler(...def.assembled.r));
    const qs = new THREE.Quaternion().setFromEuler(new THREE.Euler(...def.scattered.r));
    // The scattered cluster is kept compact so it sits beside the headline rather than behind it.
    const ps = new THREE.Vector3(def.scattered.p[0] * 0.62, def.scattered.p[1] * 0.74, def.scattered.p[2] * 0.5);
    return {
      pa: new THREE.Vector3(...def.assembled.p),
      ps,
      // Entrance: parts arrive from further out along the same direction.
      pe: ps.clone().multiplyScalar(2.6).add(new THREE.Vector3(0, 0, -3)),
      qa,
      qs,
      q: new THREE.Quaternion(),
      wobble: new THREE.Quaternion(),
      axis: new THREE.Vector3(0.3, 1, 0.2).normalize(),
      v: new THREE.Vector3(),
      phase: index * 1.37,
    };
  }, [def, index]);

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const p = progress.current ?? 0;
    const [a, b] = def.window;
    const k = smooth(clamp01((p - a) / (b - a)));
    const e = smooth(clamp01((intro.current ?? 1) * 1.15 - index * 0.012));

    // Scattered pose with a slow drift; drift fades as the part locks in.
    const drift = 1 - k;
    data.v.copy(data.ps);
    data.v.y += Math.sin(t * 0.55 + data.phase) * 0.09 * drift;
    data.v.x += Math.cos(t * 0.4 + data.phase) * 0.05 * drift;
    data.v.lerp(data.pa, k);
    // Intro: travel in from the entrance position.
    g.position.lerpVectors(data.pe, data.v, e);

    data.q.copy(data.qs);
    if (drift > 0) {
      data.wobble.setFromAxisAngle(data.axis, Math.sin(t * 0.3 + data.phase) * 0.25 * drift);
      data.q.multiply(data.wobble);
    }
    data.q.slerp(data.qa, k);
    g.quaternion.copy(data.q);
    g.scale.setScalar(0.001 + e * 0.999);

    // Once assembled, the mechanism runs.
    const s = spinRef.current;
    if (s && def.spin) {
      const run = smooth(clamp01((p - b) / 0.08));
      const speed = def.spin === "gear" ? 0.5 : def.spin === "ring" ? 0.35 : -0.25;
      if (def.spin === "gear") s.rotation.y += dt * speed * (0.15 + run);
      else s.rotation.z += dt * speed * (0.2 + run);
    }
  });

  return (
    <group ref={ref}>
      <group ref={spinRef}>{def.render(kit, gear)}</group>
    </group>
  );
}

function ConstructionLines({ progress }: { progress: RefObject<number> }) {
  const { frame, orbit } = useMemo(() => {
    const frameMat = new THREE.LineDashedMaterial({ color: "#a8adb3", dashSize: 0.08, gapSize: 0.07, transparent: true, opacity: 0.2, depthWrite: false });
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.9, 3.55, 2.9)), frameMat);
    frame.position.set(0, 0.27, 0);
    frame.computeLineDistances();
    const pts = new THREE.EllipseCurve(0, 0, 2.05, 2.05, 0, Math.PI * 2).getPoints(160);
    const orbitMat = new THREE.LineDashedMaterial({ color: "#52b78b", dashSize: 0.05, gapSize: 0.09, transparent: true, opacity: 0.25, depthWrite: false });
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((q) => new THREE.Vector3(q.x, 0, q.y))), orbitMat);
    orbit.position.set(0, -1.36, 0);
    orbit.computeLineDistances();
    return { frame, orbit };
  }, []);

  useFrame(() => {
    const p = progress.current ?? 0;
    // Guides are strongest while parts travel, then recede when the form is complete.
    const visible = 0.12 + 0.3 * Math.sin(Math.PI * clamp01(p * 1.1));
    const fade = 1 - smooth(clamp01((p - 0.85) / 0.15)) * 0.7;
    (frame.material as THREE.LineDashedMaterial).opacity = visible * fade;
    (orbit.material as THREE.LineDashedMaterial).opacity = (visible * 0.9 + 0.05) * fade;
  });

  return (
    <group>
      <primitive object={frame} />
      <primitive object={orbit} />
    </group>
  );
}

function Dust({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 12;
      arr[i * 3 + 1] = (rand() - 0.5) * 7;
      arr[i * 3 + 2] = (rand() - 0.5) * 7 - 1;
    }
    return arr;
  }, [count]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.012;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#b7babe" size={0.016} sizeAttenuation transparent opacity={0.5} depthWrite={false} />
    </points>
  );
}

function Rig({ progress, children }: { progress: RefObject<number>; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const { camera, viewport, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const smoothP = useRef(0);

  useFrame((state, dt) => {
    // Critically damped follow so scroll scrubbing feels weighted rather than twitchy.
    smoothP.current = THREE.MathUtils.damp(smoothP.current, progress.current ?? 0, 4, dt);
    const p = smoothP.current;
    // Visible width of the stage at the object's depth; the object lives in the right part of it.
    const aspect = size.width / size.height;
    const dist = 9.4 - 1.9 * p;
    const visibleW = 2 * Math.tan(THREE.MathUtils.degToRad(15)) * dist * aspect;
    const offsetX = THREE.MathUtils.clamp(visibleW * 0.23, 0, 2.6);
    const fit = THREE.MathUtils.clamp(visibleW / 8.2, 0.72, 1);
    const g = group.current;
    if (g) {
      g.position.x = THREE.MathUtils.damp(g.position.x, offsetX, 3, dt);
      g.position.y = -0.05 + 0.12 * p;
      const px = state.pointer.x;
      const py = state.pointer.y;
      const ry = 0.55 + p * 1.35 + state.clock.elapsedTime * 0.025 + px * 0.28;
      const rx = -0.06 + p * 0.1 - py * 0.1;
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ry, 2.6, dt);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, rx, 2.6, dt);
      const sc = (0.9 + 0.1 * smooth(p)) * fit;
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, sc, 3, dt));
    }
    // Camera: a slow crane move from a wide, low view to a closer three-quarter view.
    // The camera stays centred on the stage so the object's offset keeps it clear of the copy.
    target.set(0.35 * p, 0.55 + 0.75 * p, 9.4 - 1.9 * p);
    camera.position.lerp(target, 1 - Math.exp(-3 * dt));
    look.set(0.25 * p, 0.05 + 0.1 * p, 0);
    camera.lookAt(look);
    void viewport;
  });

  return <group ref={group}>{children}</group>;
}

export interface InventionSceneProps {
  tier: Exclude<GlTier, "none">;
  progress: RefObject<number>;
  intro: RefObject<number>;
  active: boolean;
  eventSource: RefObject<HTMLElement | null>;
  onReady?: () => void;
  onFallback?: () => void;
}

export default function InventionScene({ tier, progress, intro, active, eventSource, onReady, onFallback }: InventionSceneProps) {
  const [dpr, setDpr] = useState(tier === "high" ? 1.6 : 1);
  const declines = useRef(0);
  // Step quality down on slow frames; only give up on 3D after repeated declines at the lowest
  // resolution while the page is actually visible (background tabs throttle frames on purpose).
  const onDecline = () => {
    if (document.visibilityState !== "visible" || !document.hasFocus()) return;
    if (dpr > 1) {
      setDpr(1);
      return;
    }
    declines.current += 1;
    if (declines.current >= 4) onFallback?.();
  };
  return (
    <Canvas
      className="!absolute inset-0"
      frameloop={active ? "always" : "never"}
      dpr={dpr}
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      camera={{ position: [0, 0.55, 9.4], fov: 30, near: 0.1, far: 60 }}
      gl={{ antialias: tier === "high", alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onFallback?.();
        });
      }}
      aria-hidden
    >
      <PerformanceMonitor
        onDecline={onDecline}
        onIncline={() => {
          declines.current = 0;
          setDpr(tier === "high" ? 1.6 : 1.15);
        }}
      />
      <Scene tier={tier} progress={progress} intro={intro} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}

/** Reveals the canvas only after a few real frames, once shaders and the environment map are ready. */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 4) onReady?.();
  });
  return null;
}

function Scene({ tier, progress, intro }: { tier: Exclude<GlTier, "none">; progress: RefObject<number>; intro: RefObject<number> }) {
  const kit = useMaterialKit(tier);
  const gear = useMemo(() => createGearGeometry(), []);
  return (
    <>
      <StudioEnvironment />
      <ambientLight intensity={0.12} />
      <directionalLight position={[4, 6, 5]} intensity={1.15} color="#f4f1ea" />
      <directionalLight position={[-6, 2, -4]} intensity={0.5} color="#9fd9bf" />
      <Rig progress={progress}>
        {PARTS.map((def, i) => (
          <Part key={def.key} def={def} index={i} kit={kit} gear={gear} progress={progress} intro={intro} />
        ))}
        <ConstructionLines progress={progress} />
        {tier === "high" && (
          <ContactShadows position={[0, -1.36, 0]} opacity={0.55} scale={7} blur={2.6} far={3} resolution={512} color="#000000" />
        )}
      </Rig>
      <Dust count={tier === "high" ? 280 : 120} />
    </>
  );
}
