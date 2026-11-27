"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Procedural studio environment (no HDR download), rendered once into a cube map.
 *  - "dark": a charcoal room with softboxes; metals read as crisp highlights (hero, prize).
 *  - "bright": a mid-grey product studio with broad front fill, so dark finishes
 *    and screens keep their form and never fall to black (category stage).
 */
export function StudioEnvironment({ variant = "dark" }: { variant?: "dark" | "bright" }) {
  if (variant === "bright") {
    return (
      <Environment resolution={256} frames={1} environmentIntensity={1}>
        <color attach="background" args={["#3a3d42"]} />
        <Lightformer form="rect" intensity={4} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[12, 6, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[0, 1.5, 8]} scale={[14, 5, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-8, 1, 2]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[8, 1, 2]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#9fe0c1" position={[0, 2, -8]} scale={[10, 3, 1]} />
        <Lightformer form="ring" intensity={2} position={[3, 3, 5]} scale={2.5} />
      </Environment>
    );
  }
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#18191b"]} />
      <group rotation={[-Math.PI / 3, 0, 1]}>
        <Lightformer form="rect" intensity={5} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={2.2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[8, 1.2, 1]} />
        <Lightformer form="rect" intensity={2.2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[8, 0.6, 1]} />
        <Lightformer form="rect" intensity={2.6} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 2, 1]} />
      </group>
      <Lightformer form="ring" intensity={1.4} position={[2, 2, 6]} scale={3} />
      <Lightformer form="rect" intensity={0.9} color="#7fd1ab" position={[-6, -2, 3]} scale={[4, 6, 1]} />
    </Environment>
  );
}
