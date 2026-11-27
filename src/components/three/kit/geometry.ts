import * as THREE from "three";

/**
 * Procedural modeling helpers. Everything on the site is built from these:
 * lathe profiles for turned parts, bevelled extrusions for shells and plates,
 * and tubes swept along curves for frames and wires.
 */

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

/** Turned part from [radius, height] pairs (y up). */
export function lathe(points: [number, number][], segments = 64) {
  const g = new THREE.LatheGeometry(
    points.map(([r, y]) => v2(r, y)),
    segments,
  );
  // LatheGeometry builds seam-aware normals itself; recomputing them would leave a visible seam line.
  return g;
}

/** Rounded rectangle outline centered on the origin. */
export function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/**
 * Extrudes a top-down outline into a slab lying in the XZ plane, centered,
 * with soft bevelled edges. `height` is the slab thickness along Y.
 */
export function slab(shape: THREE.Shape, height: number, bevel = 0.02, bevelSegments = 4, curveSegments = 24) {
  const depth = Math.max(0.0001, height - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments,
  });
  g.rotateX(-Math.PI / 2);
  g.center();
  g.computeVertexNormals();
  return g;
}

/** Tube swept through points with a smooth curve. */
export function tube(points: [number, number, number][], radius: number, tubular = 96, radial = 16, closed = false) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    closed,
    "centripetal",
  );
  return new THREE.TubeGeometry(curve, tubular, radius, radial, closed);
}

/** A flat gear outline with spokes, as a shape (for extrusion). */
export function gearShape(teeth: number, outer: number, inner: number, bore: number, spokes = 0) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [inner, a],
      [outer, a + step * 0.2],
      [outer, a + step * 0.46],
      [inner, a + step * 0.66],
    ];
    pts.forEach(([r, t], j) => {
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r;
      if (i === 0 && j === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
  s.holes.push(hole);
  if (spokes > 0) {
    const r0 = bore * 1.6;
    const r1 = inner * 0.78;
    for (let i = 0; i < spokes; i++) {
      const a0 = (i / spokes) * Math.PI * 2 + 0.22;
      const a1 = ((i + 1) / spokes) * Math.PI * 2 - 0.22;
      const w = new THREE.Path();
      w.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
      w.absarc(0, 0, r1, a0, a1, false);
      w.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
      w.absarc(0, 0, r0, a1, a0, true);
      s.holes.push(w);
    }
  }
  return s;
}

/**
 * A propeller blade: tapered airfoil planform, thin, with real twist
 * (pitch decreases toward the tip). Lies along +X from the hub, in XZ.
 */
export function propellerBlade(length = 0.6, rootChord = 0.11, tipChord = 0.05) {
  const s = new THREE.Shape();
  s.moveTo(0, -rootChord * 0.45);
  s.bezierCurveTo(length * 0.35, -rootChord * 0.62, length * 0.8, -tipChord * 0.7, length, -tipChord * 0.15);
  s.bezierCurveTo(length * 1.02, tipChord * 0.35, length * 0.96, tipChord * 0.62, length * 0.82, tipChord * 0.62);
  s.bezierCurveTo(length * 0.5, rootChord * 0.5, length * 0.2, rootChord * 0.55, 0, rootChord * 0.4);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.006,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 24,
    steps: 1,
  });
  g.rotateX(-Math.PI / 2);
  // Twist: rotate each vertex around the blade axis (X) by a pitch that falls off toward the tip.
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = THREE.MathUtils.clamp(v.x / length, 0, 1);
    const pitch = THREE.MathUtils.lerp(0.42, 0.1, t);
    const y = v.y * Math.cos(pitch) - v.z * Math.sin(pitch);
    const z = v.y * Math.sin(pitch) + v.z * Math.cos(pitch);
    pos.setXYZ(i, v.x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** A coin with a reeded (ridged) edge and a raised rim, lying flat. */
export function coinGeometry(radius = 0.34, thickness = 0.055, ridges = 90) {
  const s = new THREE.Shape();
  const n = ridges * 2;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 2 === 0 ? radius : radius * 0.985;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return slab(s, thickness, 0.008, 2, 4);
}

/** Helix wire (springs, screw threads, filaments). */
export function helix(radius: number, height: number, turns: number, wire: number, startY = 0) {
  const pts: [number, number, number][] = [];
  const steps = Math.ceil(turns * 24);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    pts.push([Math.cos(a) * radius, startY + t * height, Math.sin(a) * radius]);
  }
  return tube(pts, wire, steps * 2, 8);
}
