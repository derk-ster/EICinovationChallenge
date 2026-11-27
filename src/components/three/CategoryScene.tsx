"use client";
/* eslint-disable react-hooks/immutability -- three.js objects are mutable by design; they are created once
   and only mutated inside the render loop, never during React render. */

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CategoryId } from "@/content/competition";
import type { GlTier } from "@/lib/client/effects";
import { coinGeometry, helix, lathe, roundedRect, slab, tube } from "./kit/geometry";
import { appScreen, chipLabel, circuitBoard, websiteScreen } from "./kit/textures";
import { useMaterialKit, type MaterialKit } from "./materials";
import { StudioEnvironment } from "./StudioEnvironment";

/**
 * One canvas, six recognizable products in the same material language:
 *  physical product → over-ear headphones
 *  website or app   → laptop showing a site + phone showing the app
 *  business         → stacks of coins with a rising trend line
 *  service          → a service bell that rings
 *  technology       → a microcontroller board
 *  improvement      → a dull bulb that turns clear and lights up
 * The active product turns into view; the others shrink away.
 */

type Kit = MaterialKit;

/* ------------------------------------------------------------ headphones */

function Headphones({ k }: { k: Kit }) {
  const geo = useMemo(() => {
    const band = tube(
      [
        [-0.64, 0.02, 0],
        [-0.62, 0.42, 0],
        [-0.43, 0.8, 0],
        [0, 0.96, 0],
        [0.43, 0.8, 0],
        [0.62, 0.42, 0],
        [0.64, 0.02, 0],
      ],
      0.032,
      160,
      16,
    );
    const pad = tube(
      [
        [-0.48, 0.6, 0],
        [-0.3, 0.8, 0],
        [0, 0.875, 0],
        [0.3, 0.8, 0],
        [0.48, 0.6, 0],
      ],
      0.06,
      120,
      18,
    );
    const cup = lathe([
      [0, 0],
      [0.3, 0],
      [0.335, 0.025],
      [0.345, 0.09],
      [0.33, 0.15],
      [0.29, 0.19],
      [0.22, 0.205],
      [0, 0.205],
    ]);
    const yoke = new THREE.TorusGeometry(0.37, 0.022, 14, 64, Math.PI);
    return { band, pad, cup, yoke };
  }, []);
  return (
    <group rotation={[0.05, -0.5, 0]} position={[0, -0.12, 0]}>
      <mesh geometry={geo.band} material={k.steel} />
      <mesh geometry={geo.pad} material={k.foam} />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.66, -0.36, 0]}>
          {/* slider */}
          <mesh position={[0, 0.34, 0]} material={k.chrome}>
            <cylinderGeometry args={[0.018, 0.018, 0.22, 16]} />
          </mesh>
          {/* yoke wraps the cup */}
          <mesh geometry={geo.yoke} material={k.aluminium} rotation={[0, Math.PI / 2, 0]} />
          {/* cup faces outward along X */}
          <group rotation={[0, 0, s * -Math.PI / 2]}>
            <mesh geometry={geo.cup} material={k.shell} position={[0, -0.07, 0]} />
            <mesh position={[0, 0.14, 0]} material={k.forest}>
              <cylinderGeometry args={[0.2, 0.2, 0.02, 64]} />
            </mesh>
            <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]} material={k.chrome}>
              <torusGeometry args={[0.215, 0.012, 12, 72]} />
            </mesh>
            <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={k.foam}>
              <torusGeometry args={[0.23, 0.075, 18, 64]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------ laptop + phone */

function Devices({ k }: { k: Kit }) {
  const { site, app, geo, screenMat, phoneMat } = useMemo(() => {
    const site = websiteScreen();
    site.repeat.set(1, 0.56);
    site.offset.set(0, 0.44);
    const app = appScreen();
    const screenMat = new THREE.MeshStandardMaterial({ color: "#000000", emissive: "#ffffff", emissiveMap: site, emissiveIntensity: 0.85, roughness: 0.2 });
    const phoneMat = new THREE.MeshStandardMaterial({ color: "#000000", emissive: "#ffffff", emissiveMap: app, emissiveIntensity: 0.8, roughness: 0.2 });
    return {
      site,
      app,
      screenMat,
      phoneMat,
      geo: {
        base: slab(roundedRect(2.0, 1.36, 0.07), 0.07, 0.02, 3),
        well: slab(roundedRect(1.74, 0.62, 0.03), 0.012, 0.004, 2),
        pad: slab(roundedRect(0.62, 0.38, 0.04), 0.008, 0.003, 2),
        lid: slab(roundedRect(2.0, 1.3, 0.07), 0.045, 0.015, 3),
        phone: slab(roundedRect(0.46, 0.94, 0.08), 0.05, 0.015, 3),
        bump: slab(roundedRect(0.17, 0.17, 0.05), 0.02, 0.006, 2),
        key: slab(roundedRect(0.105, 0.1, 0.018), 0.022, 0.006, 2),
      },
    };
  }, []);
  useEffect(
    () => () => {
      site.dispose();
      app.dispose();
      screenMat.dispose();
      phoneMat.dispose();
    },
    [site, app, screenMat, phoneMat],
  );
  // The page on screen scrolls gently, like someone browsing.
  useFrame((s) => {
    site.offset.y = 0.44 - (Math.sin(s.clock.elapsedTime * 0.35) * 0.5 + 0.5) * 0.44;
  });
  const keys = useMemo(() => {
    const out: [number, number][] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) out.push([-0.78 + c * 0.12, -0.42 + r * 0.115]);
    return out;
  }, []);
  return (
    <group rotation={[0.42, -0.45, 0]} position={[-0.1, -0.05, 0]} scale={0.95}>
      <group position={[0, -0.45, 0]}>
        <mesh geometry={geo.base} material={k.aluminium} />
        <mesh geometry={geo.well} material={k.graphite} position={[0, 0.036, -0.18]} />
        {keys.map(([x, z], i) => (
          <mesh key={i} geometry={geo.key} material={k.carbon} position={[x, 0.05, z - 0.0]} />
        ))}
        <mesh geometry={geo.pad} material={k.steel} position={[0, 0.038, 0.4]} />
        <mesh position={[0, 0.02, -0.66]} rotation={[0, 0, Math.PI / 2]} material={k.graphite}>
          <cylinderGeometry args={[0.035, 0.035, 1.5, 24]} />
        </mesh>
        {/* lid, open ~110° */}
        <group position={[0, 0.03, -0.66]} rotation={[-1.92 + Math.PI / 2, 0, 0]}>
          <group position={[0, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={geo.lid} material={k.aluminium} />
            {/* bezel + display on the face that looks toward the keyboard */}
            <mesh position={[0, 0.0235, 0]} rotation={[-Math.PI / 2, 0, 0]} material={k.rubber}>
              <planeGeometry args={[1.94, 1.24]} />
            </mesh>
            <mesh position={[0, 0.0245, 0.02]} rotation={[-Math.PI / 2, 0, 0]} material={screenMat}>
              <planeGeometry args={[1.82, 1.1]} />
            </mesh>
          </group>
        </group>
      </group>
      {/* phone leaning in front */}
      <group position={[1.5, -0.15, 0.55]} rotation={[-0.25, -0.35, 0.08]}>
        <mesh geometry={geo.phone} material={k.graphite} rotation={[Math.PI / 2, 0, 0]} />
        <mesh position={[0, 0, 0.026]} material={phoneMat}>
          <planeGeometry args={[0.42, 0.88]} />
        </mesh>
        <mesh geometry={geo.bump} material={k.carbon} rotation={[Math.PI / 2, 0, 0]} position={[-0.1, 0.34, -0.034]} />
        {[
          [-0.135, 0.375],
          [-0.065, 0.305],
        ].map(([x, y]) => (
          <mesh key={x} position={[x, y, -0.046]} rotation={[Math.PI / 2, 0, 0]} material={k.lensGlass}>
            <cylinderGeometry args={[0.028, 0.028, 0.01, 24]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------ coins + trend */

function Growth({ k }: { k: Kit }) {
  const arrowRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const { coin, plinth, arrow, head, headPos, headQuat, stacks } = useMemo(() => {
    const curvePts = [
      new THREE.Vector3(-1.05, -0.45, 0.32),
      new THREE.Vector3(-0.5, -0.3, 0.32),
      new THREE.Vector3(0.0, -0.05, 0.32),
      new THREE.Vector3(0.45, 0.12, 0.32),
      new THREE.Vector3(0.95, 0.55, 0.32),
    ];
    const curve = new THREE.CatmullRomCurve3(curvePts, false, "centripetal");
    const arrow = new THREE.TubeGeometry(curve, 160, 0.03, 14, false);
    const head = new THREE.ConeGeometry(0.08, 0.2, 24);
    const end = curve.getPoint(1);
    const tan = curve.getTangent(1);
    const headQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    const headPos = end.clone().add(tan.clone().multiplyScalar(0.08));
    let seed = 3;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const counts = [2, 4, 7, 11];
    const stacks = counts.map((n, si) =>
      Array.from({ length: n }, (_, i) => ({
        x: -0.72 + si * 0.48 + (rand() - 0.5) * 0.02,
        z: -0.05 + (rand() - 0.5) * 0.02,
        y: -0.7 + i * 0.062,
        r: rand() * Math.PI,
        top: i === n - 1,
        last: si === counts.length - 1,
      })),
    );
    return { coin: coinGeometry(0.2, 0.058, 80), plinth: slab(roundedRect(2.3, 1.0, 0.1), 0.06, 0.02, 3), arrow, head, headPos, headQuat, stacks };
  }, []);
  useFrame((s) => {
    // The trend line draws itself, holds, then redraws.
    const t = (s.clock.elapsedTime * 0.3) % 1.6;
    const kk = THREE.MathUtils.smoothstep(t, 0.05, 0.85);
    const a = arrowRef.current;
    if (a) a.geometry.setDrawRange(0, Math.floor((a.geometry.index?.count ?? 0) * kk));
    if (headRef.current) headRef.current.scale.setScalar(THREE.MathUtils.smoothstep(kk, 0.92, 1) + 0.0001);
  });
  return (
    <group rotation={[0.32, -0.55, 0]} position={[0, 0.15, 0]} scale={1.18}>
      <mesh geometry={plinth} material={k.graphite} position={[0, -0.76, 0]} />
      {stacks.flat().map((c, i) => (
        <mesh key={i} geometry={coin} material={c.top && c.last ? k.forest : k.aluminium} position={[c.x, c.y, c.z]} rotation={[0, c.r, 0]} />
      ))}
      {stacks.map((st, i) => {
        const top = st[st.length - 1];
        return (
          <mesh key={i} position={[top.x, top.y + 0.031, top.z]} rotation={[Math.PI / 2, 0, 0]} material={k.chrome}>
            <torusGeometry args={[0.15, 0.008, 8, 64]} />
          </mesh>
        );
      })}
      <mesh ref={arrowRef} geometry={arrow} material={k.forest} />
      <mesh ref={headRef} geometry={head} material={k.forest} position={headPos} quaternion={headQuat} />
    </group>
  );
}

/* ------------------------------------------------------------ service bell */

function Bell({ k }: { k: Kit }) {
  const button = useRef<THREE.Group>(null);
  const dome = useRef<THREE.Group>(null);
  const wave = useRef<THREE.Mesh>(null);
  const { base, domeGeo, cap, waveMat, domeMat } = useMemo(() => {
    const domeMat = k.chrome.clone();
    domeMat.side = THREE.DoubleSide;
    return {
      domeMat,
      base: lathe([
        [0, 0],
        [0.6, 0],
        [0.66, 0.025],
        [0.67, 0.1],
        [0.64, 0.14],
        [0.56, 0.155],
        [0, 0.155],
      ]),
      domeGeo: lathe([
        [0, 0.47],
        [0.14, 0.46],
        [0.29, 0.42],
        [0.41, 0.34],
        [0.49, 0.25],
        [0.53, 0.19],
        [0.55, 0.165],
        [0.5, 0.165],
      ]),
      cap: lathe([
        [0, 0],
        [0.085, 0],
        [0.09, 0.02],
        [0.075, 0.045],
        [0, 0.055],
      ]),
      waveMat: new THREE.MeshBasicMaterial({ color: "#5fe0a6", transparent: true, opacity: 0, depthWrite: false }),
    };
  }, [k]);
  useFrame((s) => {
    // Every few seconds: press the button, the dome rings, a wave goes out.
    const t = s.clock.elapsedTime % 3.2;
    const press = t < 0.25 ? Math.sin((t / 0.25) * Math.PI) : 0;
    if (button.current) button.current.position.y = 0.5 - press * 0.05;
    const ring = t > 0.12 ? Math.exp(-(t - 0.12) * 3) : 0;
    if (dome.current) {
      dome.current.rotation.z = Math.sin(t * 40) * 0.018 * ring;
      dome.current.rotation.x = Math.cos(t * 37) * 0.012 * ring;
    }
    const w = wave.current;
    if (w) {
      const wt = THREE.MathUtils.clamp((t - 0.12) / 1.4, 0, 1);
      w.scale.setScalar(0.9 + wt * 1.4);
      waveMat.opacity = wt > 0 ? (1 - wt) * 0.7 : 0;
    }
  });
  return (
    <group position={[0, -0.62, 0]} rotation={[0.28, 0, 0]} scale={1.3}>
      <mesh geometry={base} material={k.graphite} />
      <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]} material={k.steel}>
        <torusGeometry args={[0.64, 0.012, 10, 96]} />
      </mesh>
      <group ref={dome}>
        <mesh geometry={domeGeo} material={domeMat} />
        <mesh position={[0, 0.47, 0]} material={k.chrome}>
          <cylinderGeometry args={[0.035, 0.05, 0.03, 24]} />
        </mesh>
      </group>
      <group ref={button} position={[0, 0.5, 0]}>
        <mesh position={[0, 0.05, 0]} material={k.chrome}>
          <cylinderGeometry args={[0.02, 0.02, 0.14, 16]} />
        </mesh>
        <mesh geometry={cap} material={k.forest} position={[0, 0.11, 0]} />
      </group>
      <mesh ref={wave} position={[0, 0.17, 0]} rotation={[Math.PI / 2, 0, 0]} material={waveMat}>
        <torusGeometry args={[0.6, 0.008, 6, 96]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------ microcontroller */

function Board({ k }: { k: Kit }) {
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const { pcb, pcbMats, chip, labelMat, small, capGeo, usb, crystal } = useMemo(() => {
    const tex = circuitBoard();
    tex.repeat.set(1 / 2.1, 1 / 1.4);
    tex.offset.set(0.5, 0.5);
    const top = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.3 });
    const side = new THREE.MeshStandardMaterial({ color: "#163d2e", roughness: 0.6 });
    const label = chipLabel("EIC");
    const labelMat = new THREE.MeshStandardMaterial({ map: label, roughness: 0.35, metalness: 0.1 });
    return {
      pcb: slab(roundedRect(2.1, 1.4, 0.08), 0.06, 0.01, 2),
      pcbMats: [top, side],
      chip: slab(roundedRect(0.52, 0.52, 0.03), 0.07, 0.012, 2),
      labelMat,
      small: slab(roundedRect(0.3, 0.2, 0.02), 0.05, 0.008, 2),
      capGeo: lathe([
        [0, 0],
        [0.07, 0],
        [0.07, 0.2],
        [0.064, 0.21],
        [0, 0.212],
      ]),
      usb: slab(roundedRect(0.3, 0.12, 0.05), 0.11, 0.01, 2),
      crystal: slab(roundedRect(0.2, 0.08, 0.04), 0.04, 0.008, 2),
    };
  }, []);
  useFrame((s) => {
    if (led.current) led.current.emissiveIntensity = Math.sin(s.clock.elapsedTime * 3) > 0 ? 3 : 0.2;
  });
  const pins = useMemo(() => {
    const out: { p: [number, number, number]; r: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const o = -0.2 + i * 0.045;
      out.push({ p: [o, -0.005, 0.29], r: 0 }, { p: [o, -0.005, -0.29], r: 0 }, { p: [0.29, -0.005, o], r: Math.PI / 2 }, { p: [-0.29, -0.005, o], r: Math.PI / 2 });
    }
    return out;
  }, []);
  return (
    <group rotation={[0.62, -0.45, 0]} position={[0, -0.05, 0]}>
      <mesh geometry={pcb} material={pcbMats} />
      <group position={[-0.15, 0.065, 0.05]}>
        <mesh geometry={chip} material={k.carbon} />
        <mesh position={[0, 0.0355, 0]} rotation={[-Math.PI / 2, 0, 0]} material={labelMat}>
          <planeGeometry args={[0.44, 0.44]} />
        </mesh>
        {pins.map((pin, i) => (
          <mesh key={i} position={pin.p} rotation={[0, pin.r, 0]} material={k.chrome}>
            <boxGeometry args={[0.022, 0.012, 0.08]} />
          </mesh>
        ))}
      </group>
      <mesh geometry={small} material={k.carbon} position={[0.55, 0.055, 0.32]} />
      <mesh geometry={small} material={k.carbon} position={[0.55, 0.055, -0.05]} />
      <mesh geometry={crystal} material={k.aluminium} position={[0.2, 0.05, -0.42]} />
      {[
        [0.6, -0.42],
        [0.82, -0.42],
        [0.82, -0.18],
      ].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0.03, z]}>
          <mesh geometry={capGeo} material={k.carbon} />
          <mesh position={[0, 0.213, 0]} material={k.aluminium}>
            <cylinderGeometry args={[0.064, 0.064, 0.004, 32]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={usb} material={k.steel} position={[-0.98, 0.085, -0.35]} rotation={[0, Math.PI / 2, 0]} />
      {/* header pins */}
      <mesh position={[0, 0.06, 0.58]} material={k.carbon}>
        <boxGeometry args={[1.2, 0.06, 0.1]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[-0.55 + i * 0.1, 0.13, 0.58]} material={k.chrome}>
          <boxGeometry args={[0.022, 0.1, 0.022]} />
        </mesh>
      ))}
      <mesh position={[0.82, 0.045, 0.25]}>
        <boxGeometry args={[0.07, 0.03, 0.05]} />
        <meshStandardMaterial ref={led} color="#0c2a1e" emissive="#5fe0a6" emissiveIntensity={2} />
      </mesh>
      <mesh position={[0.82, 0.045, 0.37]} material={k.ledWhite}>
        <boxGeometry args={[0.07, 0.03, 0.05]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------ bulb improvement */

function Bulb({ k }: { k: Kit }) {
  const light = useRef<THREE.PointLight>(null);
  const m = useMemo(() => {
    const profile: [number, number][] = [
      [0.17, 0.3],
      [0.2, 0.38],
      [0.31, 0.52],
      [0.42, 0.7],
      [0.45, 0.9],
      [0.39, 1.1],
      [0.23, 1.22],
      [0, 1.255],
    ];
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: "#8d9298",
      roughness: 0.5,
      metalness: 0,
      clearcoat: 1,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
      emissive: "#bfffe0",
      emissiveIntensity: 0,
    });
    const filamentMat = new THREE.MeshStandardMaterial({ color: "#2a2f2c", emissive: "#bfffe0", emissiveIntensity: 0.05 });
    const coil = helix(0.03, 0.34, 9, 0.008);
    coil.rotateZ(Math.PI / 2);
    coil.translate(0.17, 0.82, 0);
    const support = (sx: number) =>
      tube(
        [
          [0, 0.62, 0],
          [sx * 0.08, 0.72, 0],
          [sx * 0.17, 0.82, 0],
        ],
        0.006,
        24,
        6,
      );
    return {
      glassMat,
      filamentMat,
      dull: new THREE.Color("#8d9298"),
      clear: new THREE.Color("#f2f7f4"),
      glass: lathe(profile, 72),
      filament: coil,
      base: lathe([
        [0, 0],
        [0.17, 0],
        [0.17, 0.3],
        [0, 0.3],
      ]),
      thread: helix(0.172, 0.24, 4, 0.016, 0.03),
      stem: tube(
        [
          [0, 0.3, 0],
          [0, 0.5, 0],
          [0, 0.64, 0],
        ],
        0.04,
        24,
        16,
      ),
      supports: [support(-1), support(1)],
      contact: lathe([
        [0, -0.06],
        [0.08, -0.06],
        [0.13, -0.02],
        [0.17, 0],
        [0, 0],
      ]),
    };
  }, []);
  useEffect(
    () => () => {
      m.glassMat.dispose();
      m.filamentMat.dispose();
    },
    [m],
  );
  useFrame((s) => {
    // Before: a dull, frosted bulb that's off. After: clear glass with the filament glowing. Then it resets.
    const t = (s.clock.elapsedTime * 0.3) % 2;
    const on = THREE.MathUtils.smoothstep(t, 0.35, 0.8) * (1 - THREE.MathUtils.smoothstep(t, 1.55, 1.95));
    m.glassMat.color.lerpColors(m.dull, m.clear, on);
    m.glassMat.roughness = 0.5 - 0.46 * on;
    m.glassMat.opacity = 0.9 - 0.62 * on;
    m.glassMat.emissiveIntensity = on * 0.18;
    m.filamentMat.emissiveIntensity = 0.05 + on * 4.5;
    if (light.current) light.current.intensity = on * 5;
  });
  return (
    <group position={[0, -0.95, 0]} scale={1.4}>
      <mesh geometry={m.stem} material={m.glassMat} />
      {m.supports.map((g, i) => (
        <mesh key={i} geometry={g} material={k.steel} />
      ))}
      <mesh geometry={m.filament} material={m.filamentMat} />
      <mesh geometry={m.glass} material={m.glassMat} />
      <mesh geometry={m.base} material={k.aluminium} />
      <mesh geometry={m.thread} material={k.aluminium} />
      <mesh geometry={m.contact} material={k.carbon} />
      <pointLight ref={light} position={[0, 0.82, 0]} color="#bfffe0" intensity={0} distance={3} decay={2} />
    </group>
  );
}

/* ------------------------------------------------------------ stage */

const objects: Record<CategoryId, (p: { k: Kit }) => React.ReactNode> = {
  "physical-product": Headphones,
  "website-app": Devices,
  "business-startup": Growth,
  service: Bell,
  "software-tool": Board,
  improvement: Bulb,
};

function Slot({ id, active, k }: { id: CategoryId; active: boolean; k: Kit }) {
  const ref = useRef<THREE.Group>(null);
  const Obj = objects[id];
  useFrame((s, dt) => {
    const g = ref.current;
    if (!g) return;
    const sc = THREE.MathUtils.damp(g.scale.x, active ? 1 : 0, 6, dt);
    g.scale.setScalar(Math.max(sc, 0.0001));
    g.visible = sc > 0.01;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, active ? s.pointer.x * 0.35 + Math.sin(s.clock.elapsedTime * 0.25) * 0.15 : -1.2, 4, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, active ? -s.pointer.y * 0.12 : 0.4, 4, dt);
    g.position.y = Math.sin(s.clock.elapsedTime * 0.7) * 0.04;
  });
  return (
    <group ref={ref} scale={0.0001}>
      <Obj k={k} />
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

export default function CategoryScene({
  tier,
  activeId,
  running,
  onReady,
}: {
  tier: Exclude<GlTier, "none">;
  activeId: CategoryId;
  running: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={tier === "high" ? [1, 1.6] : 1}
      camera={{ position: [0, 0.75, 4.8], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        camera.lookAt(0, -0.05, 0);
      }}
      aria-hidden
    >
      <SceneContents tier={tier} activeId={activeId} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}

function SceneContents({ tier, activeId }: { tier: Exclude<GlTier, "none">; activeId: CategoryId }) {
  const k = useMaterialKit(tier);
  return (
    <>
      <StudioEnvironment variant="bright" />
      <ambientLight intensity={0.25} />
      {/* three-point product lighting */}
      <directionalLight position={[3, 5, 4]} intensity={1.8} color="#fff8ef" />
      <directionalLight position={[-4, 2, 3]} intensity={0.7} color="#e6efff" />
      <directionalLight position={[-2, 4, -5]} intensity={1.3} color="#a6e6c8" />
      {(Object.keys(objects) as CategoryId[]).map((id) => (
        <Slot key={id} id={id} active={id === activeId} k={k} />
      ))}
      {tier === "high" && <ContactShadows position={[0, -0.95, 0]} opacity={0.55} scale={6} blur={2.6} far={2} resolution={256} />}
    </>
  );
}
