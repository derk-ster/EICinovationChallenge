"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { CategoryId } from "@/content/competition";
import type { GlTier } from "@/lib/client/effects";
import { createGearGeometry, useMaterialKit, type MaterialKit } from "./materials";
import { StudioEnvironment } from "./StudioEnvironment";

/**
 * One canvas, six procedural objects in the same material language.
 * The active category's object scales and turns into view; the others
 * shrink away. Each object has a small idle behavior of its own.
 */

function PhysicalProduct({ kit }: { kit: MaterialKit }) {
  const lid = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (lid.current) lid.current.position.y = 0.62 + Math.sin(s.clock.elapsedTime * 1.2) * 0.06;
  });
  return (
    <group rotation={[0.25, 0.6, 0]}>
      <RoundedBox args={[1.5, 1.0, 1.0]} radius={0.16} smoothness={5} material={kit.steel} />
      <mesh material={kit.forest} position={[0, 0.05, 0]}>
        <boxGeometry args={[1.52, 0.14, 1.02]} />
      </mesh>
      <group ref={lid}>
        <RoundedBox args={[1.2, 0.12, 0.8]} radius={0.05} material={kit.graphite} />
      </group>
      <mesh material={kit.chrome} position={[0.45, 0.2, 0.52]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 32]} />
      </mesh>
    </group>
  );
}

function WebsiteApp({ kit }: { kit: MaterialKit }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!g.current) return;
    g.current.children.forEach((c, i) => {
      c.position.z = -i * 0.38 + Math.sin(s.clock.elapsedTime * 0.9 + i) * 0.05;
    });
  });
  return (
    <group rotation={[-0.1, -0.55, 0]} position={[0.1, 0, 0]}>
      <group ref={g}>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[i * 0.22, i * 0.18, -i * 0.38]}>
            <RoundedBox args={[1.6, 1.05, 0.05]} radius={0.04} material={i === 0 ? kit.graphite : kit.steel} />
            {i === 0 && (
              <>
                <mesh material={kit.forest} position={[-0.35, 0.28, 0.035]}>
                  <boxGeometry args={[0.7, 0.14, 0.02]} />
                </mesh>
                <mesh material={kit.chrome} position={[-0.25, 0.02, 0.035]}>
                  <boxGeometry args={[0.9, 0.06, 0.02]} />
                </mesh>
                <mesh material={kit.chrome} position={[-0.35, -0.12, 0.035]}>
                  <boxGeometry args={[0.7, 0.06, 0.02]} />
                </mesh>
                <mesh material={kit.forest} position={[0.45, -0.3, 0.035]}>
                  <boxGeometry args={[0.4, 0.16, 0.02]} />
                </mesh>
              </>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}

function BusinessGrowth({ kit }: { kit: MaterialKit }) {
  const bars = useRef<THREE.Group>(null);
  const heights = [0.35, 0.6, 0.85, 1.2, 1.65];
  useFrame((s) => {
    bars.current?.children.forEach((c, i) => {
      const t = (Math.sin(s.clock.elapsedTime * 0.8 - i * 0.5) + 1) / 2;
      c.scale.y = 0.85 + t * 0.15;
    });
  });
  return (
    <group rotation={[0.35, -0.6, 0]} position={[0, -0.55, 0]}>
      <RoundedBox args={[2.1, 0.08, 0.9]} radius={0.02} material={kit.graphite} position={[0, -0.04, 0]} />
      <group ref={bars}>
        {heights.map((h, i) => (
          <group key={i} position={[-0.8 + i * 0.4, 0, 0]}>
            <mesh material={i === heights.length - 1 ? kit.forest : kit.steel} position={[0, h / 2, 0]}>
              <boxGeometry args={[0.26, h, 0.26]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function ServiceNetwork({ kit }: { kit: MaterialKit }) {
  const g = useRef<THREE.Group>(null);
  const nodes = useMemo(
    () => Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 1.05, Math.sin(a * 2) * 0.18, Math.sin(a) * 1.05);
    }),
    [],
  );
  const links = useMemo(() => {
    const items: { pos: THREE.Vector3; quat: THREE.Quaternion; len: number }[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const pairs: [THREE.Vector3, THREE.Vector3][] = nodes.map((n, i) => [n, nodes[(i + 1) % nodes.length]]);
    nodes.forEach((n) => pairs.push([n, new THREE.Vector3(0, 0, 0)]));
    for (const [a, b] of pairs) {
      const d = new THREE.Vector3().subVectors(b, a);
      items.push({
        pos: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
        quat: new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()),
        len: d.length(),
      });
    }
    return items;
  }, [nodes]);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.25;
  });
  return (
    <group rotation={[0.45, 0, 0]}>
      <group ref={g}>
        <mesh material={kit.forest}>
          <sphereGeometry args={[0.26, 48, 48]} />
        </mesh>
        {nodes.map((n, i) => (
          <mesh key={i} position={n} material={kit.chrome}>
            <sphereGeometry args={[0.14, 32, 32]} />
          </mesh>
        ))}
        {links.map((l, i) => (
          <mesh key={i} position={l.pos} quaternion={l.quat} material={kit.steel}>
            <cylinderGeometry args={[0.014, 0.014, l.len, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function TechChip({ kit }: { kit: MaterialKit }) {
  const die = useRef<THREE.Mesh>(null);
  const pins = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 7; i++) {
      const o = -0.66 + i * 0.22;
      out.push([o, 0, 0.9], [o, 0, -0.9], [0.9, 0, o], [-0.9, 0, o]);
    }
    return out;
  }, []);
  useFrame((s) => {
    if (die.current) die.current.position.y = 0.14 + Math.sin(s.clock.elapsedTime * 1.4) * 0.025;
  });
  return (
    <group rotation={[0.95, 0.55, 0]}>
      <RoundedBox args={[1.7, 0.12, 1.7]} radius={0.03} material={kit.graphite} />
      <mesh ref={die} material={kit.steel} position={[0, 0.14, 0]}>
        <boxGeometry args={[0.8, 0.12, 0.8]} />
      </mesh>
      <mesh material={kit.forest} position={[0, 0.215, 0]}>
        <boxGeometry args={[0.36, 0.02, 0.36]} />
      </mesh>
      {pins.map((p, i) => (
        <mesh key={i} position={p} material={kit.steel}>
          <boxGeometry args={[0.07, 0.05, 0.07]} />
        </mesh>
      ))}
    </group>
  );
}

function Improvement({ kit }: { kit: MaterialKit }) {
  const rough = useRef<THREE.Mesh>(null);
  const refined = useRef<THREE.Mesh>(null);
  const gear = useMemo(() => createGearGeometry(16, 0.95, 0.86, 0.6, 0.05), []);
  const gearRef = useRef<THREE.Mesh>(null);
  const flat = useMemo(() => {
    const m = kit.graphite.clone();
    m.flatShading = true;
    return m;
  }, [kit]);
  useFrame((s, dt) => {
    // Continuous before → after: the faceted form gives way to the refined one, then resets.
    const t = (s.clock.elapsedTime * 0.35) % 2;
    const k = THREE.MathUtils.smoothstep(t, 0.3, 1.0) * (1 - THREE.MathUtils.smoothstep(t, 1.6, 2));
    rough.current?.scale.setScalar(0.62 * (1 - k) + 0.001);
    refined.current?.scale.setScalar(0.6 * k + 0.001);
    if (rough.current) rough.current.rotation.y += dt * 0.4;
    if (gearRef.current) gearRef.current.rotation.y += dt * 0.3;
  });
  return (
    <group rotation={[0.3, 0, 0]}>
      <mesh ref={rough} material={flat}>
        <icosahedronGeometry args={[1, 0]} />
      </mesh>
      <mesh ref={refined} material={kit.chrome}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      <mesh ref={gearRef} geometry={gear} material={kit.forest} rotation={[0.2, 0, 0]} />
    </group>
  );
}

const objects: Record<CategoryId, (p: { kit: MaterialKit }) => React.ReactNode> = {
  "physical-product": PhysicalProduct,
  "website-app": WebsiteApp,
  "business-startup": BusinessGrowth,
  service: ServiceNetwork,
  "software-tool": TechChip,
  improvement: Improvement,
};

function Slot({ id, active, kit }: { id: CategoryId; active: boolean; kit: MaterialKit }) {
  const ref = useRef<THREE.Group>(null);
  const Obj = objects[id];
  useFrame((s, dt) => {
    const g = ref.current;
    if (!g) return;
    const target = active ? 1 : 0;
    const sc = THREE.MathUtils.damp(g.scale.x, target, 6, dt);
    g.scale.setScalar(Math.max(sc, 0.0001));
    g.visible = sc > 0.01;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, active ? s.pointer.x * 0.35 : -1.2, 4, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, active ? -s.pointer.y * 0.15 : 0.4, 4, dt);
    g.position.y = Math.sin(s.clock.elapsedTime * 0.7) * 0.05;
  });
  return (
    <group ref={ref} scale={0.0001}>
      <Obj kit={kit} />
    </group>
  );
}

export default function CategoryScene({
  tier,
  activeId,
  running,
}: {
  tier: Exclude<GlTier, "none">;
  activeId: CategoryId;
  running: boolean;
}) {
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={tier === "high" ? [1, 1.5] : 1}
      camera={{ position: [0, 0.4, 5.2], fov: 32 }}
      gl={{ antialias: tier === "high", alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
      aria-hidden
    >
      <SceneContents tier={tier} activeId={activeId} />
    </Canvas>
  );
}

function SceneContents({ tier, activeId }: { tier: Exclude<GlTier, "none">; activeId: CategoryId }) {
  const kit = useMaterialKit(tier);
  return (
    <>
      <StudioEnvironment />
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      {(Object.keys(objects) as CategoryId[]).map((id) => (
        <Slot key={id} id={id} active={id === activeId} kit={kit} />
      ))}
    </>
  );
}
