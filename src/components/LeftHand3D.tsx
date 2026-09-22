import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import handModelUrl from '../assets/rigged_lowpoly_hand.glb?url';

/**
 * LeftHand3D
 * ----------
 * Renders the low-poly hand as a regular (non-skinned) mesh with red wireframe.
 * We extract the geometry from the SkinnedMesh and render it as a plain Mesh,
 * bypassing the skeleton system which was causing the vertices to collapse.
 *
 * The bind-pose geometry already looks like a hand with fingers extended,
 * which works great for our claw/reaching visual.
 *
 * Mesh vertex bounds (from GLB accessor):
 *   X: [-25, +41]  → ~66 units wide
 *   Y: [-54, +54]  → ~108 units tall
 *   Z: [-13, +13]  → ~26 units deep
 */
export function LeftHand3D({ position = [-4, 0, 0] as [number, number, number], scale = 0.07 }) {
  const { nodes } = useGLTF(handModelUrl);
  const groupRef = useRef<THREE.Group>(null!);

  // Extract the geometry from the SkinnedMesh and create a static wireframe
  const geometry = useMemo(() => {
    // The mesh node is "mesh_0" based on the GLB inspection
    const skinnedMesh = (nodes as any).mesh_0 as THREE.SkinnedMesh | undefined;
    if (skinnedMesh && skinnedMesh.geometry) {
      return skinnedMesh.geometry;
    }
    // Fallback: search all nodes for a mesh
    for (const key of Object.keys(nodes)) {
      const node = (nodes as any)[key];
      if (node?.isMesh && node.geometry) {
        return node.geometry as THREE.BufferGeometry;
      }
    }
    return null;
  }, [nodes]);

  // Smooth cursor tracking
  useFrame((state) => {
    if (!groupRef.current) return;
    const targetX = -0.3 + state.pointer.y * 0.3;
    const targetY = 0.5 + state.pointer.x * 0.4;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.045);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.045);
  });

  if (!geometry) return null;

  return (
    <group ref={groupRef} position={position} rotation={[-0.3, 0.5, 0.4]}>
      <mesh geometry={geometry} scale={scale}>
        <meshBasicMaterial color={0xff3333} wireframe />
      </mesh>
    </group>
  );
}

useGLTF.preload(handModelUrl);
