"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Procedural studio environment (no HDR download). Rendered once into a cube
 * map: a charcoal room with large softboxes so chrome and steel get crisp,
 * believable reflections.
 */
export function StudioEnvironment({ accent = true }: { accent?: boolean }) {
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
      {accent && <Lightformer form="rect" intensity={0.9} color="#7fd1ab" position={[-6, -2, 3]} scale={[4, 6, 1]} />}
    </Environment>
  );
}
