"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { GlTier } from "@/lib/client/effects";
import { brushedRoughness } from "./kit/textures";

/**
 * Shared physically based material kit. Every 3D object on the site is built
 * from these finishes so the scenes read as one family:
 * machined metals, coated plastics, rubber, glass and a forest-green accent.
 */
export function useMaterialKit(tier: Exclude<GlTier, "none">) {
  const kit = useMemo(() => {
    const brushed = brushedRoughness();
    brushed.repeat.set(2, 2);
    const brushedFine = brushedRoughness(120, 60);
    brushedFine.repeat.set(3, 3);

    const chrome = new THREE.MeshStandardMaterial({ color: "#f1f3f5", metalness: 1, roughness: 0.06 });
    const steel = new THREE.MeshStandardMaterial({ color: "#c3c7cc", metalness: 1, roughness: 0.42, roughnessMap: brushed });
    const aluminium = new THREE.MeshStandardMaterial({ color: "#d4d7db", metalness: 0.9, roughness: 0.5, roughnessMap: brushedFine });
    // Dark parts are dielectric with a clear coat, so they keep form under any lighting instead of reflecting black.
    const graphite = new THREE.MeshPhysicalMaterial({ color: "#2d3035", metalness: 0.15, roughness: 0.48, clearcoat: 0.6, clearcoatRoughness: 0.35 });
    const carbon = new THREE.MeshPhysicalMaterial({ color: "#222428", metalness: 0.3, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.12 });
    const shell = new THREE.MeshPhysicalMaterial({ color: "#e4e6e8", metalness: 0, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18 });
    const forest = new THREE.MeshPhysicalMaterial({ color: "#1f6a4e", metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 });
    const rubber = new THREE.MeshStandardMaterial({ color: "#1c1d20", metalness: 0, roughness: 0.92 });
    const foam = new THREE.MeshStandardMaterial({ color: "#26282c", metalness: 0, roughness: 1 });
    const ledGreen = new THREE.MeshStandardMaterial({ color: "#0c2a1e", emissive: "#5fe0a6", emissiveIntensity: 2.2, roughness: 0.3 });
    const ledWhite = new THREE.MeshStandardMaterial({ color: "#222", emissive: "#f3f1ea", emissiveIntensity: 1.6, roughness: 0.3 });
    const lensGlass = new THREE.MeshPhysicalMaterial({ color: "#0b1612", metalness: 0.2, roughness: 0.02, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.6 });
    const glass =
      tier === "high"
        ? new THREE.MeshPhysicalMaterial({
            color: "#eef5f1",
            metalness: 0,
            roughness: 0.03,
            transmission: 1,
            thickness: 0.35,
            ior: 1.5,
            clearcoat: 1,
            clearcoatRoughness: 0.04,
          })
        : new THREE.MeshPhysicalMaterial({
            color: "#dfe8e3",
            metalness: 0.1,
            roughness: 0.06,
            transparent: true,
            opacity: 0.32,
            clearcoat: 1,
            depthWrite: false,
          });
    return { chrome, steel, aluminium, graphite, carbon, shell, forest, rubber, foam, ledGreen, ledWhite, lensGlass, glass, textures: [brushed, brushedFine] };
  }, [tier]);

  useEffect(
    () => () => {
      Object.values(kit).forEach((m) => {
        if (m instanceof THREE.Material) m.dispose();
      });
      kit.textures.forEach((t) => t.dispose());
    },
    [kit],
  );
  return kit;
}

export type MaterialKit = ReturnType<typeof useMaterialKit>;
