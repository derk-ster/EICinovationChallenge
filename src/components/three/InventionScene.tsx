"use client";
/* eslint-disable react-hooks/immutability -- three.js objects (vectors, materials, geometries) are
   mutable by design; they are created once and only mutated inside the render loop, never during React render. */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import { useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import type { GlTier } from "@/lib/client/effects";
import { lathe, propellerBlade, roundedRect, slab, tube } from "./kit/geometry";
import { useMaterialKit, type MaterialKit } from "./materials";
import { StudioEnvironment } from "./StudioEnvironment";

/**
 * "The Invention" — a camera drone, built from parts as the visitor scrolls.
 *
 * It starts as loose components (an idea in pieces). Scrolling assembles it in
 * a real build order: body, battery and canopy, then arms, motors, landing
 * gear, camera and finally propellers. At the end the props spin up, the LEDs
 * come on, the drone lifts off its shadow, and the blueprint box around it
 * breaks apart: the idea leaves the drawing board.
 */

type V3 = [number, number, number];

interface Geo {
  body: THREE.BufferGeometry;
  canopy: THREE.BufferGeometry;
  battery: THREE.BufferGeometry;
  band: THREE.BufferGeometry;
  arm: THREE.BufferGeometry;
  motor: THREE.BufferGeometry;
  motorCap: THREE.BufferGeometry;
  blade: THREE.BufferGeometry;
  hub: THREE.BufferGeometry;
  skidL: THREE.BufferGeometry;
  skidR: THREE.BufferGeometry;
  lens: THREE.BufferGeometry;
  housing: THREE.BufferGeometry;
  mount: THREE.BufferGeometry;
}

/** Shared per-frame state that parts read (spin-up and lift amounts). */
interface Run {
  spin: number;
  lift: number;
}

function useDroneGeometry(): Geo {
  return useMemo(() => {
    const arm = slab(armShape(), 0.07, 0.02, 3);
    arm.translate(0.39, 0, 0);
    const lens = lathe(
      [
        [0, 0],
        [0.066, 0],
        [0.066, 0.025],
        [0.06, 0.03],
        [0.06, 0.06],
        [0.052, 0.068],
        [0.038, 0.07],
        [0, 0.07],
      ],
      48,
    );
    lens.rotateX(Math.PI / 2);
    return {
      body: slab(roundedRect(0.78, 1.22, 0.32), 0.22, 0.06, 5),
      canopy: slab(roundedRect(0.5, 0.8, 0.22), 0.1, 0.04, 4),
      battery: slab(roundedRect(0.5, 0.88, 0.08), 0.15, 0.03, 3),
      band: slab(roundedRect(0.52, 0.07, 0.02), 0.165, 0.01, 2),
      arm,
      motor: lathe([
        [0, 0],
        [0.15, 0],
        [0.152, 0.018],
        [0.132, 0.03],
        [0.13, 0.05],
        [0.124, 0.056],
        [0.124, 0.135],
        [0.11, 0.158],
        [0.05, 0.168],
        [0, 0.168],
      ]),
      motorCap: lathe([
        [0, 0.166],
        [0.055, 0.166],
        [0.05, 0.186],
        [0.028, 0.198],
        [0, 0.2],
      ]),
      blade: propellerBlade(0.52, 0.1, 0.045),
      hub: lathe([
        [0, 0],
        [0.05, 0],
        [0.05, 0.03],
        [0.035, 0.045],
        [0, 0.05],
      ]),
      skidL: skid(-1),
      skidR: skid(1),
      lens,
      housing: slab(roundedRect(0.22, 0.2, 0.06), 0.17, 0.035, 3),
      mount: lathe([
        [0, 0],
        [0.07, 0],
        [0.07, 0.02],
        [0.03, 0.04],
        [0.03, 0.09],
        [0, 0.09],
      ]),
    };
  }, []);
}

function armShape() {
  // Tapered carbon arm, root to motor mount, with a rounded tip.
  const s = new THREE.Shape();
  s.moveTo(-0.39, -0.085);
  s.lineTo(0.3, -0.05);
  s.quadraticCurveTo(0.42, -0.05, 0.42, 0);
  s.quadraticCurveTo(0.42, 0.05, 0.3, 0.05);
  s.lineTo(-0.39, 0.085);
  s.closePath();
  return s;
}

function skid(side: -1 | 1) {
  const x = 0.33 * side;
  return tube(
    [
      [x * 0.72, -0.17, -0.26],
      [x * 0.98, -0.42, -0.34],
      [x * 1.04, -0.55, -0.28],
      [x * 1.04, -0.56, 0],
      [x * 1.04, -0.55, 0.28],
      [x * 0.98, -0.42, 0.34],
      [x * 0.72, -0.17, 0.26],
    ],
    0.02,
    120,
    12,
  );
}

const DIAG = [
  { key: "fl", x: -1, z: 1 },
  { key: "fr", x: 1, z: 1 },
  { key: "rl", x: -1, z: -1 },
  { key: "rr", x: 1, z: -1 },
] as const;
const R = 1.04; // motor radius from center

interface PartDef {
  key: string;
  assembled: { p: V3; r: V3 };
  scattered: { p: V3; r: V3 };
  window: [number, number];
  render: (k: MaterialKit, g: Geo, run: Run) => React.ReactNode;
}

function Arm({ k, g, front }: { k: MaterialKit; g: Geo; front: boolean }) {
  return (
    <group>
      <mesh geometry={g.arm} material={k.carbon} />
      {/* LED under the motor mount: green at the front, white at the back, like real orientation lights */}
      <mesh position={[0.74, -0.045, 0]} material={front ? k.ledGreen : k.ledWhite}>
        <boxGeometry args={[0.06, 0.02, 0.05]} />
      </mesh>
    </group>
  );
}

function Motor({ k, g }: { k: MaterialKit; g: Geo }) {
  return (
    <group>
      <mesh geometry={g.motor} material={k.steel} />
      <mesh geometry={g.motorCap} material={k.chrome} />
      {[0.075, 0.1, 0.12].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={k.graphite}>
          <torusGeometry args={[0.125, 0.006, 8, 64]} />
        </mesh>
      ))}
    </group>
  );
}

function Propeller({ k, g, front, dir, run }: { k: MaterialKit; g: Geo; front: boolean; dir: 1 | -1; run: Run }) {
  const spinner = useRef<THREE.Group>(null);
  const discMat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const grd = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(0.2, "rgba(220,224,228,0.5)");
    grd.addColorStop(0.85, "rgba(220,224,228,0.35)");
    grd.addColorStop(1, "rgba(220,224,228,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  }, []);
  const blades = front ? k.forest : k.carbon;
  useFrame((_, dt) => {
    const s = spinner.current;
    if (!s) return;
    // Spin from idle to full speed; at speed the blades fade into a motion-blur disc like a real prop.
    s.rotation.y += dt * dir * (0.4 + run.spin * 46);
    const blur = THREE.MathUtils.smoothstep(run.spin, 0.25, 0.9);
    discMat.opacity = blur * 0.45;
    s.children.forEach((m) => {
      if (m.userData.blade) m.visible = blur < 0.98;
    });
  });
  return (
    <group>
      <group ref={spinner}>
        <mesh geometry={g.hub} material={k.chrome} />
        <mesh geometry={g.blade} material={blades} position={[0.03, 0.03, 0]} userData={{ blade: true }} />
        <mesh geometry={g.blade} material={blades} position={[-0.03, 0.03, 0]} rotation={[0, Math.PI, 0]} userData={{ blade: true }} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} material={discMat}>
        <circleGeometry args={[0.56, 48]} />
      </mesh>
    </group>
  );
}

function SkidPart({ k, g, side }: { k: MaterialKit; g: Geo; side: -1 | 1 }) {
  return (
    <group>
      <mesh geometry={side < 0 ? g.skidL : g.skidR} material={k.aluminium} />
      {[-0.2, 0.2].map((z) => (
        <mesh key={z} position={[side * 0.343, -0.56, z]} rotation={[Math.PI / 2, 0, 0]} material={k.rubber}>
          <cylinderGeometry args={[0.028, 0.028, 0.1, 16]} />
        </mesh>
      ))}
    </group>
  );
}

function buildParts(): PartDef[] {
  const parts: PartDef[] = [
    {
      key: "body",
      render: (k, g) => (
        <group>
          <mesh geometry={g.body} material={k.shell} />
          {[-1, 1].map((s) =>
            [-0.2, -0.08, 0.04].map((z) => (
              <mesh key={`${s}${z}`} position={[s * 0.392, 0, z]} material={k.graphite}>
                <boxGeometry args={[0.012, 0.05, 0.08]} />
              </mesh>
            )),
          )}
        </group>
      ),
      assembled: { p: [0, 0, 0], r: [0, 0, 0] },
      scattered: { p: [0.1, 0.25, 0.55], r: [0.4, 0.6, 0.2] },
      window: [0.04, 0.26],
    },
    {
      key: "battery",
      render: (k, g) => (
        <group>
          <mesh geometry={g.battery} material={k.graphite} />
          <mesh geometry={g.band} material={k.forest} position={[0, 0, 0.18]} />
          <mesh position={[0, 0, -0.45]} material={k.aluminium}>
            <boxGeometry args={[0.16, 0.05, 0.03]} />
          </mesh>
        </group>
      ),
      assembled: { p: [0, -0.17, -0.02], r: [0, 0, 0] },
      scattered: { p: [0.95, -0.95, 0.4], r: [0.6, -0.4, 0.8] },
      window: [0.1, 0.32],
    },
    {
      key: "canopy",
      render: (k, g) => <mesh geometry={g.canopy} material={k.forest} />,
      assembled: { p: [0, 0.13, -0.04], r: [0, 0, 0] },
      scattered: { p: [-0.55, 1.15, 0.2], r: [1.0, 0.3, 0.4] },
      window: [0.14, 0.36],
    },
  ];

  const armScatter: V3[] = [
    [-1.6, 0.5, 0.8],
    [1.7, 0.85, 0.2],
    [-1.35, -0.8, -0.6],
    [1.45, -0.45, -0.9],
  ];
  const motorScatter: V3[] = [
    [-0.95, 1.45, -0.4],
    [0.65, 1.55, -0.65],
    [-1.85, -0.2, 0.25],
    [1.9, 0.15, 0.75],
  ];
  const propScatter: V3[] = [
    [-1.25, 1.0, 1.1],
    [1.25, 1.25, 1.0],
    [-0.65, -1.3, 0.9],
    [0.45, -1.4, -0.5],
  ];

  DIAG.forEach((d, i) => {
    const angle = Math.atan2(d.z, d.x);
    const front = d.z > 0;
    const mx = (d.x * R) / Math.SQRT2;
    const mz = (d.z * R) / Math.SQRT2;
    parts.push({
      key: `arm-${d.key}`,
      render: (k, g) => <Arm k={k} g={g} front={front} />,
      assembled: { p: [(d.x * 0.3) / Math.SQRT2, 0, (d.z * 0.3) / Math.SQRT2], r: [0, -angle, 0] },
      scattered: { p: armScatter[i], r: [0.3 + i * 0.4, 0.8 - i * 0.3, 1.0 - i * 0.5] },
      window: [0.2 + i * 0.03, 0.44 + i * 0.03],
    });
    parts.push({
      key: `motor-${d.key}`,
      render: (k, g) => <Motor k={k} g={g} />,
      assembled: { p: [mx, 0.034, mz], r: [0, 0, 0] },
      scattered: { p: motorScatter[i], r: [1.1 - i * 0.3, i * 0.7, 0.4 + i * 0.2] },
      window: [0.32 + i * 0.025, 0.54 + i * 0.025],
    });
    const dir: 1 | -1 = i === 0 || i === 3 ? 1 : -1; // diagonal pairs counter-rotate, like a real quadcopter
    parts.push({
      key: `prop-${d.key}`,
      render: (k, g, run) => <Propeller k={k} g={g} front={front} dir={dir} run={run} />,
      assembled: { p: [mx, 0.236, mz], r: [0, i * 0.7, 0] },
      scattered: { p: propScatter[i], r: [0.9 - i * 0.2, i * 1.1, 0.6 + i * 0.3] },
      window: [0.6 + i * 0.03, 0.8 + i * 0.03],
    });
  });

  parts.push(
    {
      key: "skid-l",
      render: (k, g) => <SkidPart k={k} g={g} side={-1} />,
      assembled: { p: [0, 0, 0], r: [0, 0, 0] },
      scattered: { p: [-1.9, -1.05, -0.2], r: [0.3, 0.6, 0.5] },
      window: [0.42, 0.62],
    },
    {
      key: "skid-r",
      render: (k, g) => <SkidPart k={k} g={g} side={1} />,
      assembled: { p: [0, 0, 0], r: [0, 0, 0] },
      scattered: { p: [1.95, -1.15, 0], r: [-0.4, 0.2, -0.6] },
      window: [0.45, 0.65],
    },
    {
      key: "gimbal",
      render: (k, g) => (
        <group>
          <mesh geometry={g.mount} material={k.aluminium} position={[0, -0.09, 0]} />
          <mesh position={[0, -0.18, 0.02]} material={k.steel}>
            <boxGeometry args={[0.3, 0.025, 0.05]} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.145, -0.26, 0.02]} material={k.steel}>
              <boxGeometry args={[0.022, 0.17, 0.05]} />
            </mesh>
          ))}
          <mesh geometry={g.housing} material={k.graphite} position={[0, -0.3, 0.02]} />
          <mesh geometry={g.lens} material={k.chrome} position={[0, -0.3, 0.12]} />
          <mesh position={[0, -0.3, 0.192]} material={k.lensGlass}>
            <circleGeometry args={[0.04, 40]} />
          </mesh>
        </group>
      ),
      assembled: { p: [0, -0.02, 0.44], r: [0, 0, 0] },
      scattered: { p: [0.2, -0.65, 1.3], r: [0.5, -0.8, 0.3] },
      window: [0.48, 0.68],
    },
    {
      key: "antennas",
      render: (k) => (
        <group>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.18, -0.02, -0.56]} rotation={[0.9, 0, s * 0.25]}>
              <mesh position={[0, -0.14, 0]} material={k.graphite}>
                <cylinderGeometry args={[0.012, 0.016, 0.28, 12]} />
              </mesh>
              <mesh position={[0, -0.29, 0]} material={k.chrome}>
                <sphereGeometry args={[0.02, 16, 16]} />
              </mesh>
            </group>
          ))}
        </group>
      ),
      assembled: { p: [0, 0, 0], r: [0, 0, 0] },
      scattered: { p: [0.05, 1.7, -1.0], r: [1.2, 0.4, 0.2] },
      window: [0.52, 0.7],
    },
  );
  return parts;
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function Part({
  def,
  index,
  kit,
  geo,
  progress,
  intro,
  run,
}: {
  def: PartDef;
  index: number;
  kit: MaterialKit;
  geo: Geo;
  progress: RefObject<number>;
  intro: RefObject<number>;
  run: Run;
}) {
  const ref = useRef<THREE.Group>(null);
  const data = useMemo(() => {
    const ps = new THREE.Vector3(...def.scattered.p);
    return {
      pa: new THREE.Vector3(...def.assembled.p),
      ps,
      pe: ps.clone().multiplyScalar(2.4).add(new THREE.Vector3(0, 0, -3)),
      qa: new THREE.Quaternion().setFromEuler(new THREE.Euler(...def.assembled.r)),
      qs: new THREE.Quaternion().setFromEuler(new THREE.Euler(...def.scattered.r)),
      q: new THREE.Quaternion(),
      wobble: new THREE.Quaternion(),
      axis: new THREE.Vector3(0.3, 1, 0.2).normalize(),
      v: new THREE.Vector3(),
      phase: index * 1.37,
    };
  }, [def, index]);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const p = progress.current ?? 0;
    const [a, b] = def.window;
    const k = smooth(clamp01((p - a) / (b - a)));
    const e = smooth(clamp01((intro.current ?? 1) * 1.15 - index * 0.012));
    const drift = 1 - k;
    data.v.copy(data.ps);
    data.v.y += Math.sin(t * 0.55 + data.phase) * 0.09 * drift;
    data.v.x += Math.cos(t * 0.4 + data.phase) * 0.05 * drift;
    data.v.lerp(data.pa, k);
    g.position.lerpVectors(data.pe, data.v, e);
    data.q.copy(data.qs);
    if (drift > 0) {
      data.wobble.setFromAxisAngle(data.axis, Math.sin(t * 0.3 + data.phase) * 0.35 * drift);
      data.q.multiply(data.wobble);
    }
    data.q.slerp(data.qa, k);
    g.quaternion.copy(data.q);
    g.scale.setScalar(0.001 + e * 0.999);
  });

  return <group ref={ref}>{def.render(kit, geo, run)}</group>;
}

/**
 * The blueprint box. While parts travel it frames the build; at the end its
 * twelve edges break away outward and fade, so the finished drone isn't boxed in.
 */
function Blueprint({ progress }: { progress: RefObject<number> }) {
  const { edges, ring } = useMemo(() => {
    // Sized to the drone's real footprint (props included) so it frames the build without crowding the page.
    const w = 2.95;
    const h = 1.3;
    const d = 2.95;
    const y0 = -0.62;
    const y1 = y0 + h;
    const xs = [-w / 2, w / 2];
    const zs = [-d / 2, d / 2];
    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    for (const y of [y0, y1]) {
      segs.push([new THREE.Vector3(xs[0], y, zs[0]), new THREE.Vector3(xs[1], y, zs[0])]);
      segs.push([new THREE.Vector3(xs[0], y, zs[1]), new THREE.Vector3(xs[1], y, zs[1])]);
      segs.push([new THREE.Vector3(xs[0], y, zs[0]), new THREE.Vector3(xs[0], y, zs[1])]);
      segs.push([new THREE.Vector3(xs[1], y, zs[0]), new THREE.Vector3(xs[1], y, zs[1])]);
    }
    for (const x of xs) for (const z of zs) segs.push([new THREE.Vector3(x, y0, z), new THREE.Vector3(x, y1, z)]);
    const center = new THREE.Vector3(0, (y0 + y1) / 2, 0);
    const edges = segs.map(([a, b], i) => {
      const mat = new THREE.LineDashedMaterial({ color: "#a8adb3", dashSize: 0.08, gapSize: 0.07, transparent: true, opacity: 0, depthWrite: false });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat);
      line.computeLineDistances();
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const out = mid.sub(center).normalize();
      return { line, out, spin: (i % 2 ? 1 : -1) * (0.3 + (i % 3) * 0.2) };
    });
    const pts = new THREE.EllipseCurve(0, 0, 1.65, 1.65, 0, Math.PI * 2).getPoints(160);
    const ringMat = new THREE.LineDashedMaterial({ color: "#52b78b", dashSize: 0.05, gapSize: 0.09, transparent: true, opacity: 0, depthWrite: false });
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((q) => new THREE.Vector3(q.x, 0, q.y))), ringMat);
    ring.position.y = y0;
    ring.computeLineDistances();
    return { edges, ring };
  }, []);

  useFrame(() => {
    const p = progress.current ?? 0;
    const show = 0.34 * smooth(clamp01(p / 0.08));
    const release = smooth(clamp01((p - 0.8) / 0.16));
    edges.forEach(({ line, out, spin }) => {
      line.position.copy(out).multiplyScalar(release * 2.2);
      line.rotation.y = release * spin;
      (line.material as THREE.LineDashedMaterial).opacity = show * (1 - release);
      line.visible = release < 0.999;
    });
    ring.scale.setScalar(1 + release * 0.8);
    (ring.material as THREE.LineDashedMaterial).opacity = (show * 0.9 + 0.04) * (1 - release);
    ring.visible = release < 0.999;
  });

  return (
    <group>
      {edges.map(({ line }, i) => (
        <primitive key={i} object={line} />
      ))}
      <primitive object={ring} />
    </group>
  );
}

function Dust({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
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

const SPAN = 3.0; // assembled width including propellers, as seen from the three-quarter view
const FOV = 30;

function Rig({ progress, run, tier, children }: { progress: RefObject<number>; run: Run; tier: Exclude<GlTier, "none">; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const liftGroup = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const smoothP = useRef(0);

  useFrame((state, dt) => {
    smoothP.current = THREE.MathUtils.damp(smoothP.current, progress.current ?? 0, 4, dt);
    const p = smoothP.current;
    const t = state.clock.elapsedTime;

    // Camera: a slow crane from a higher, wider view down to a closer three-quarter view.
    target.set(0.3 * p, 2.7 - 0.8 * p, 9.4 - 1.6 * p);
    camera.position.lerp(target, 1 - Math.exp(-3 * dt));
    look.set(0, -0.1, 0);
    camera.lookAt(look);

    // Fit: the finished drone always fits the right-hand column, fully in frame.
    const aspect = size.width / size.height;
    const dist = target.length();
    const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * dist;
    const visibleW = visibleH * aspect;
    const fit = Math.min(1.25, (0.38 * visibleW) / SPAN, (0.5 * visibleH) / 1.7);
    const offsetX = aspect > 1.15 ? visibleW * 0.235 : 0;

    // Run phase: props spin up, then the drone lifts off its shadow.
    run.spin = smooth(clamp01((p - 0.83) / 0.09));
    run.lift = smooth(clamp01((p - 0.88) / 0.1));

    const g = group.current;
    if (g) {
      g.position.x = THREE.MathUtils.damp(g.position.x, offsetX, 3, dt);
      g.position.y = -0.05;
      const ry = 0.6 + p * 1.3 + t * 0.03 + state.pointer.x * 0.25;
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ry, 2.6, dt);
      const sc = fit * (0.8 + 0.2 * smooth(p));
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, sc, 3, dt));
    }
    const l = liftGroup.current;
    if (l) {
      // Hovering drones bob, and bank toward where they're heading (here: the cursor).
      l.position.y = run.lift * (0.42 + Math.sin(t * 1.6) * 0.04);
      l.rotation.z = THREE.MathUtils.damp(l.rotation.z, -state.pointer.x * 0.12 * run.lift, 3, dt);
      l.rotation.x = THREE.MathUtils.damp(l.rotation.x, state.pointer.y * 0.08 * run.lift, 3, dt);
    }
    if (shadow.current) shadow.current.scale.setScalar(1 + run.lift * 0.25);
  });

  return (
    <group ref={group}>
      <group ref={liftGroup}>{children}</group>
      <group ref={shadow}>
        {tier === "high" && (
          <ContactShadows position={[0, -0.64, 0]} opacity={0.6} scale={5} blur={2.4} far={2.4} resolution={512} color="#000000" />
        )}
      </group>
      <Blueprint progress={progress} />
    </group>
  );
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 4) onReady?.();
  });
  return null;
}

function LedPulse({ kit, run }: { kit: MaterialKit; run: Run }) {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const on = 0.25 + run.spin * 0.75;
    kit.ledGreen.emissiveIntensity = on * (2 + Math.sin(t * 6) * 0.6);
    kit.ledWhite.emissiveIntensity = on * (Math.sin(t * 3) > 0.6 ? 2.4 : 1.2);
  });
  return null;
}

function Scene({ tier, progress, intro }: { tier: Exclude<GlTier, "none">; progress: RefObject<number>; intro: RefObject<number> }) {
  const kit = useMaterialKit(tier);
  const geo = useDroneGeometry();
  const parts = useMemo(() => buildParts(), []);
  const run = useMemo<Run>(() => ({ spin: 0, lift: 0 }), []);
  return (
    <>
      <StudioEnvironment />
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 7, 5]} intensity={1.6} color="#f4f1ea" />
      <directionalLight position={[-6, 3, 4]} intensity={0.45} color="#d8e6ff" />
      <directionalLight position={[-3, 4, -6]} intensity={0.9} color="#9fd9bf" />
      <LedPulse kit={kit} run={run} />
      <Rig progress={progress} run={run} tier={tier}>
        {parts.map((def, i) => (
          <Part key={def.key} def={def} index={i} kit={kit} geo={geo} progress={progress} intro={intro} run={run} />
        ))}
      </Rig>
      <Dust count={tier === "high" ? 280 : 120} />
    </>
  );
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
      camera={{ position: [0, 2.7, 9.4], fov: FOV, near: 0.1, far: 60 }}
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
