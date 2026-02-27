// app/Lazy3DViewer.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Grid } from '@react-three/drei';

export default function Lazy3DViewer({
  modelUrl,
  onCapture,
}: {
  modelUrl: string;
  onCapture: () => void;
}) {
  function Model({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} dispose={null} />;
  }

  return (
    <Canvas
      gl={{ preserveDrawingBuffer: true }}
      camera={{ position: [0, 15, 25], fov: 45 }}
      style={{ background: '#111' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow />
      <Model url={modelUrl} />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <Grid args={[200, 200]} position={[0, -0.01, 0]} />
      <Environment preset="sunset" />
    </Canvas>
  );
}