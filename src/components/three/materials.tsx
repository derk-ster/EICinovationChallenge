"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { GlTier } from "@/lib/client/effects";

/**
 * Shared physically based material kit. Every 3D object on the site is built
 * from these five finishes so the scenes read as one family.
 */
export function useMaterialKit(tier: Exclude<GlTier, "none">) {
  return useMemo(() => {
    const chrome = new THREE.MeshStandardMaterial({ color: "#eceff1", metalness: 1, roughness: 0.07, envMapIntensity: 1.25 });
    const steel = new THREE.MeshStandardMaterial({ color: "#b9bdc2", metalness: 1, roughness: 0.34, envMapIntensity: 1 });
    const graphite = new THREE.MeshStandardMaterial({ color: "#2b2d31", metalness: 0.75, roughness: 0.42, envMapIntensity: 0.9 });
    const forest = new THREE.MeshStandardMaterial({ color: "#1f6a4e", metalness: 0.85, roughness: 0.28, envMapIntensity: 1.1 });
    const glass =
      tier === "high"
        ? new THREE.MeshPhysicalMaterial({
            color: "#e4efe9",
            metalness: 0,
            roughness: 0.04,
            transmission: 1,
            thickness: 0.6,
            ior: 1.45,
            envMapIntensity: 1.2,
            clearcoat: 1,
            clearcoatRoughness: 0.05,
          })
        : new THREE.MeshPhysicalMaterial({
            color: "#cfdcd6",
            metalness: 0.1,
            roughness: 0.08,
            transparent: true,
            opacity: 0.42,
            envMapIntensity: 1.3,
            clearcoat: 1,
          });
    return { chrome, steel, graphite, forest, glass };
  }, [tier]);
}

export type MaterialKit = ReturnType<typeof useMaterialKit>;

/** Flat gear with a center bore, lying in the XZ plane. */
export function createGearGeometry(teeth = 14, outer = 0.62, inner = 0.52, bore = 0.17, depth = 0.09) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const pts = [
      [inner, a0],
      [outer, a0 + step * 0.18],
      [outer, a0 + step * 0.48],
      [inner, a0 + step * 0.66],
    ] as const;
    pts.forEach(([r, a], j) => {
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.center();
  geo.rotateX(-Math.PI / 2);
  return geo;
}
