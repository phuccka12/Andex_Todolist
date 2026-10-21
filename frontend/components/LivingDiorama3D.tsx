'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sun, CloudRain, Zap, Moon } from 'lucide-react';

interface LivingDiorama3DProps {
  activeTaskTitle?: string;
  isDeepWork?: boolean;
}

export const LivingDiorama3D: React.FC<LivingDiorama3DProps> = ({
  activeTaskTitle = 'Deep Work: Kiến Trúc Model',
  isDeepWork = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [weather, setWeather] = useState<'rain' | 'sun' | 'night'>('rain');
  const [lampOn, setLampOn] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(weather === 'night' ? 0x06080d : weather === 'rain' ? 0x0a0e17 : 0x0f1422);

    const aspect = width / height;
    const d = 5;
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Subtle Ambient lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, weather === 'night' ? 0.3 : 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(15, 25, 10);
    scene.add(dirLight);

    // Warm Brass Lamp Point Light
    const lampLight = new THREE.PointLight(0xf59e0b, lampOn ? 2.0 : 0, 8);
    lampLight.position.set(-1, 2.2, 0.5);
    scene.add(lampLight);

    // Room Base Floor (Subdued Matte Charcoal)
    const floorGeo = new THREE.BoxGeometry(6, 0.3, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x141a29, roughness: 0.5 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    scene.add(floor);

    // Desk (Architectural Matte Walnut)
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1c2438, roughness: 0.6 });
    const deskGeo = new THREE.BoxGeometry(3.6, 0.18, 1.8);
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, 1.2, 0);
    scene.add(desk);

    // Desk Legs
    const legGeo = new THREE.BoxGeometry(0.1, 1.2, 0.1);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0b0f19 });
    [
      [-1.6, 0.6, -0.7],
      [1.6, 0.6, -0.7],
      [-1.6, 0.6, 0.7],
      [1.6, 0.6, 0.7],
    ].forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      scene.add(leg);
    });

    // Laptop
    const laptopMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
    const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.6), laptopMat);
    laptopBase.position.set(0, 1.31, 0);
    scene.add(laptopBase);

    const laptopScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.6, 0.04),
      new THREE.MeshStandardMaterial({
        color: isDeepWork ? 0x1db954 : 0x64748b,
        emissive: isDeepWork ? 0x1db954 : 0x1e293b,
        emissiveIntensity: 0.4,
      })
    );
    laptopScreen.position.set(0, 1.6, -0.3);
    laptopScreen.rotation.x = -0.2;
    scene.add(laptopScreen);

    // Desk Lamp
    const lampMat = new THREE.MeshStandardMaterial({ color: lampOn ? 0xf59e0b : 0x334155 });
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), lampMat);
    lampBase.position.set(-1, 1.32, 0.5);
    scene.add(lampBase);

    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.35, 16), lampMat);
    lampShade.position.set(-1, 2.05, 0.5);
    lampShade.rotation.x = Math.PI;
    scene.add(lampShade);

    // Subdued Rain Particles
    const particleCount = 120;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 8;
      rainPositions[i + 1] = Math.random() * 6;
      rainPositions[i + 2] = -2.8;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x64748b,
      size: 0.05,
      transparent: true,
      opacity: weather === 'rain' ? 0.4 : 0.0,
    });
    const rainParticles = new THREE.Points(rainGeo, rainMat);
    scene.add(rainParticles);

    // Slow ambient animation
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (weather === 'rain') {
        const positions = rainParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < particleCount * 3; i += 3) {
          positions[i] -= 0.12;
          if (positions[i] < 0) positions[i] = 6;
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
      }

      scene.rotation.y = Math.sin(Date.now() * 0.0003) * 0.04;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 240;
      renderer.setSize(w, h);
      const a = w / h;
      camera.left = -d * a;
      camera.right = d * a;
      camera.top = d;
      camera.bottom = -d;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [weather, lampOn, isDeepWork]);

  return (
    <div className="atelier-surface rounded-2xl p-5 space-y-4 border border-white/[0.06]">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            Living Diorama
          </span>
          <h2 className="text-xs font-semibold text-slate-200 mt-0.5">
            Không Gian Tĩnh Tại
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/[0.06]">
          <button
            onClick={() => setWeather('rain')}
            className={`p-1.5 rounded-md transition-colors ${
              weather === 'rain' ? 'bg-white/[0.1] text-slate-200' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mưa"
          >
            <CloudRain className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setWeather('sun')}
            className={`p-1.5 rounded-md transition-colors ${
              weather === 'sun' ? 'bg-white/[0.1] text-slate-200' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Nắng"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setWeather('night')}
            className={`p-1.5 rounded-md transition-colors ${
              weather === 'night' ? 'bg-white/[0.1] text-slate-200' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Đêm"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLampOn(!lampOn)}
            className={`p-1.5 rounded-md transition-colors ${
              lampOn ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
            }`}
            title="Đèn bàn"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={mountRef} className="w-full h-52 rounded-xl overflow-hidden bg-black/40 border border-white/[0.04]" />

      {/* Integrated Mascot & Status Footer (No broken fragmented cards) */}
      <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1DB954]" />
          <span className="text-slate-300 font-medium truncate max-w-[150px]">{activeTaskTitle}</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          {isDeepWork ? 'DEEP WORK' : 'FOCUS'}
        </span>
      </div>
    </div>
  );
};
