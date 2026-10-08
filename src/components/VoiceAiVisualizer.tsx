'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function VoiceAiVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = 260;
    const height = 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for AI Neural Core
    const aiGroup = new THREE.Group();

    // 1. Inner Core Glowing Sphere
    const coreGeo = new THREE.IcosahedronGeometry(0.8, 2);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x00f0ff,
      wireframe: true,
      emissive: 0x00a8ff,
      emissiveIntensity: 0.5,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    aiGroup.add(coreMesh);

    // 2. Outer Orbital Ring 1
    const ring1Geo = new THREE.TorusGeometry(1.3, 0.02, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.6, transparent: true });
    const ring1Mesh = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1Mesh.rotation.x = Math.PI / 3;
    aiGroup.add(ring1Mesh);

    // 3. Outer Orbital Ring 2 (Emerald)
    const ring2Geo = new THREE.TorusGeometry(1.5, 0.015, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x10b981, opacity: 0.5, transparent: true });
    const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2Mesh.rotation.y = Math.PI / 4;
    aiGroup.add(ring2Mesh);

    // 4. Floating Particles (Neural Nodes)
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 60;
    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 3.5;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.04,
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    aiGroup.add(particleSystem);

    scene.add(aiGroup);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00f0ff, 1.5, 10);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      aiGroup.rotation.y += 0.015;
      aiGroup.rotation.x += 0.008;
      ring1Mesh.rotation.z += 0.02;
      ring2Mesh.rotation.z -= 0.015;
      
      const time = Date.now() * 0.003;
      coreMesh.scale.setScalar(1 + Math.sin(time) * 0.06);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-[260px] h-[260px] relative flex items-center justify-center">
      <div ref={containerRef} className="w-[260px] h-[260px]" />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-cyan-500/30 text-[10px] font-mono text-cyan-400 flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span>Voice Stream Active (&lt;120ms)</span>
      </div>
    </div>
  );
}
