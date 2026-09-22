import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import handModelUrl from '../assets/rigged_lowpoly_hand.glb?url';
import { rig as r } from './scanRig';

/**
 * AugmentedHand
 * -------------
 * The same hand geometry drawn a few times and cut with clipping planes at
 * the scan line:
 *  • above the line → human (warm, flat shaded)
 *  • below the line → machine (dark metal + teal wireframe)
 *  • pulses of light running up the machine part, like signals on a circuit
 *  • a bright slice right at the line
 *
 * Clipping planes are in world space, so they stay horizontal while the hand
 * sways. Needs `gl.localClippingEnabled = true` on the Canvas.
 *
 * In the GLB the fingers point along -Y, so the hand is flipped (z = π) to
 * reach upwards.
 */

const BASE_SCALE = 0.057;
// model half-height in model units (Y bounds are ±54)
const HALF_HEIGHT = 54;
// hand height relative to the ring diameter
const HAND_TO_RING = 0.74;
const BAND = 0.12;

// keep y > scan / keep y < scan, plus pairs for the pulse bands and the slice.
// Module level because there's only ever one hand and they get mutated every frame.
const planes = {
  human: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  machine: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
  pulses: [0, 1].map(() => [
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
  ]),
  slice: [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)],
};

export function AugmentedHand() {
  const { nodes } = useGLTF(handModelUrl);
  const groupRef = useRef<THREE.Group>(null!);
  const scanLight = useRef<THREE.PointLight>(null!);

  const geometry = useMemo(() => {
    const skinnedMesh = (nodes as any).mesh_0 as THREE.SkinnedMesh | undefined;
    if (skinnedMesh && skinnedMesh.geometry) {
      return skinnedMesh.geometry;
    }
    for (const key of Object.keys(nodes)) {
      const node = (nodes as any)[key];
      if (node?.isMesh && node.geometry) {
        return node.geometry as THREE.BufferGeometry;
      }
    }
    return null;
  }, [nodes]);

  const center = useMemo(() => {
    if (!geometry) return new THREE.Vector3();
    geometry.computeBoundingBox();
    return geometry.boundingBox!.getCenter(new THREE.Vector3());
  }, [geometry]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;
    const { viewport, size, clock } = state;
    const t = clock.elapsedTime;

    // size and place the hand relative to the ring, so it fits on any screen
    const ringWorld = (r.ring / size.height) * viewport.height;
    const s = (HAND_TO_RING * ringWorld) / (HALF_HEIGHT * 2);
    group.scale.setScalar(s / BASE_SCALE);

    // rises out of the ring as the hero scrolls away
    const rise = r.scroll * 0.27 * ringWorld;
    group.position.set(0.03 * ringWorld, -0.175 * ringWorld + rise, 0);

    // slow sway + a bit of cursor follow
    const px = r.still || r.coarse ? 0 : r.pointerX / r.w - 0.5;
    const sway = r.still ? 0 : Math.sin(t * 0.4) * 0.22;
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, -0.35 + sway + px * 0.5, 0.05);

    // scan line px → world y on the z=0 plane
    const scanWorld = (0.5 - r.scanY / size.height) * viewport.height;
    const minY = group.position.y - HALF_HEIGHT * s;
    const maxY = group.position.y + HALF_HEIGHT * s;
    r.pct = THREE.MathUtils.clamp((scanWorld - minY) / (maxY - minY), 0, 1);
    r.handTop = (0.5 - maxY / viewport.height) * size.height;
    r.handBottom = (0.5 - minY / viewport.height) * size.height;

    planes.human.constant = -scanWorld;
    planes.machine.constant = scanWorld;
    planes.slice[0].constant = -(scanWorld - 0.05);
    planes.slice[1].constant = scanWorld + 0.05;

    // signals travel from the wrist up to the scan line
    planes.pulses.forEach(([lo, hi], i) => {
      const phase = r.still ? 0.5 : (t * 0.45 + i * 0.5) % 1;
      const y = Math.min(minY + (scanWorld - minY) * phase, scanWorld);
      lo.constant = -(y - BAND);
      hi.constant = y + BAND;
    });

    scanLight.current.position.set(0, scanWorld, 2.5);
    scanLight.current.intensity = r.pct > 0 && r.pct < 1 ? 4 : 0;
  });

  if (!geometry) return null;

  const offset = center.clone().multiplyScalar(-BASE_SCALE);

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[-4, 6, 5]} intensity={2.2} color="#ffd9b0" />
      <pointLight position={[4, -4, 3]} intensity={30} distance={14} color="#2FA3A8" />
      <pointLight ref={scanLight} distance={3.5} decay={1.5} color="#7ff6ff" />

      <group ref={groupRef}>
        {/* flip so the fingers point up, lean towards the letters */}
        <group rotation={[0, 0, Math.PI - 0.18]}>
          <group position={offset} scale={BASE_SCALE}>
            {/* human */}
            <mesh geometry={geometry}>
              <meshStandardMaterial
                color="#b9785e"
                roughness={0.6}
                metalness={0.05}
                flatShading
                clippingPlanes={[planes.human]}
              />
            </mesh>

            {/* machine: dark metal body + teal wireframe */}
            <mesh geometry={geometry}>
              <meshStandardMaterial
                color="#12272a"
                roughness={0.3}
                metalness={0.9}
                flatShading
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
                clippingPlanes={[planes.machine]}
              />
            </mesh>
            <mesh geometry={geometry}>
              <meshBasicMaterial
                color="#2FA3A8"
                wireframe
                transparent
                opacity={0.6}
                clippingPlanes={[planes.machine]}
              />
            </mesh>

            {/* signal pulses */}
            {planes.pulses.map((pair, i) => (
              <mesh key={i} geometry={geometry}>
                <meshBasicMaterial
                  color="#7ff6ff"
                  wireframe
                  transparent
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  clippingPlanes={[planes.machine, ...pair]}
                />
              </mesh>
            ))}

            {/* bright slice on the scan line */}
            <mesh geometry={geometry}>
              <meshBasicMaterial
                color="#fff1cf"
                wireframe
                transparent
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                clippingPlanes={planes.slice}
              />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
}

useGLTF.preload(handModelUrl);
