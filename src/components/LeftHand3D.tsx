import { useRef, useMemo, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import handModelUrl from '../assets/rigged_lowpoly_hand.glb?url';
import { DIR_LEFT, fingertip, fingertipGap, pointerNdc, type HeroRig } from './heroRig';

/**
 * LeftHand3D
 * ----------
 * Low-poly hand rendered as a plain wireframe mesh (we take the geometry out of
 * the SkinnedMesh and skip the skeleton, which was collapsing the vertices).
 *
 * In the bind pose the fingers point along -Y and the wrist is at +Y.
 * The mesh is offset so the fingertip sits at the group origin — that way we
 * can place/rotate the group around the fingertip and keep it on the
 * convergence point.
 */

const BASE_SCALE = 0.07;
// rotate the fingers (-Y) so they point down-right, towards the centre
// (DIR_LEFT is screen space, y down → flip y for world space)
const BASE_ROT = new THREE.Euler(0.5, -0.35, Math.atan2(DIR_LEFT.y, -DIR_LEFT.x) + Math.PI / 2);

export function LeftHand3D({ rig }: { rig: RefObject<HeroRig> }) {
  const { nodes } = useGLTF(handModelUrl);
  const groupRef = useRef<THREE.Group>(null!);

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

  // average of the lowest vertices = the longest fingertip
  const tip = useMemo(() => {
    const out = new THREE.Vector3();
    if (!geometry) return out;
    const pos = geometry.attributes.position;
    let minY = Infinity;
    for (let i = 0; i < pos.count; i++) minY = Math.min(minY, pos.getY(i));
    let n = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < minY + 3) {
        out.x += pos.getX(i);
        out.y += pos.getY(i);
        out.z += pos.getZ(i);
        n++;
      }
    }
    return out.divideScalar(n);
  }, [geometry]);

  useFrame((state) => {
    const r = rig.current;
    if (!groupRef.current || !r) return;
    const { viewport, size } = state;

    // fingertip position in hero px → world units on the z=0 plane
    const p = fingertip(r, DIR_LEFT, fingertipGap(r, performance.now()));
    groupRef.current.position.set(
      (p.x / size.width - 0.5) * viewport.width,
      (0.5 - p.y / size.height) * viewport.height,
      0,
    );

    // portrait screens get a smaller hand
    const aspect = size.width / size.height;
    groupRef.current.scale.setScalar(Math.min(1, 0.5 + aspect * 0.4));

    // lean a little towards the cursor
    const ndc = pointerNdc(r);
    const g = groupRef.current.rotation;
    g.x = THREE.MathUtils.lerp(g.x, BASE_ROT.x + ndc.y * 0.2, 0.05);
    g.y = THREE.MathUtils.lerp(g.y, BASE_ROT.y + ndc.x * 0.25, 0.05);
    g.z = BASE_ROT.z;
  });

  if (!geometry) return null;

  return (
    <group ref={groupRef} rotation={BASE_ROT}>
      <mesh geometry={geometry} scale={BASE_SCALE} position={tip.clone().multiplyScalar(-BASE_SCALE)}>
        <meshBasicMaterial color="#E8907A" wireframe transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

useGLTF.preload(handModelUrl);
