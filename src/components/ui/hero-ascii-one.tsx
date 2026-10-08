'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';

interface HeroAsciiOneProps {
  onOpenLogin?: () => void;
}

export default function HeroAsciiOne({ onOpenLogin }: HeroAsciiOneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Agentic Node Mesh Simulation
    const nodes = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * width * 0.55,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1.5,
    }));

    const render = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Draw agentic connecting lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw agentic nodes
      nodes.forEach((node) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width * 0.55) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <main className="relative min-h-screen w-full bg-black text-white font-mono overflow-hidden flex flex-col justify-between p-6 lg:p-12">
      {/* Background Agentic Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-20 flex items-center justify-between border-b border-white/20 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl lg:text-3xl font-bold tracking-widest uppercase italic transform -skew-x-6 text-white">
            AI AGENT EMPLOYEE
          </span>
          <span className="text-xs text-white/50 border border-white/30 px-2 py-0.5 rounded">
            v3.7
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/70">
          <span className="hidden sm:inline">ENTERPRISE PLATFORM</span>
          <button
            onClick={onOpenLogin}
            type="button"
            className="px-4 py-1.5 border border-white text-white hover:bg-white hover:text-black transition-colors duration-200 cursor-pointer font-bold"
          >
            SIGN IN
          </button>
        </div>
      </header>

      {/* Corner Frame Accents */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/40 z-20 pointer-events-none"></div>
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/40 z-20 pointer-events-none"></div>
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/40 z-20 pointer-events-none"></div>
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/40 z-20 pointer-events-none"></div>

      {/* Hero CTA Center-Right Panel */}
      <div className="relative z-10 my-auto ml-auto w-full lg:w-1/2 max-w-xl bg-black/85 backdrop-blur-md p-6 lg:p-10 border border-white/30 shadow-2xl">
        <div className="flex items-center gap-2 mb-4 opacity-70">
          <div className="w-8 h-px bg-white"></div>
          <span className="text-xs tracking-widest text-white">7-AGENT WORKFORCE ENGINE</span>
          <div className="flex-1 h-px bg-white"></div>
        </div>

        <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4 tracking-wider leading-tight">
          AUTONOMOUS WORKFORCE
        </h2>

        <p className="text-xs lg:text-sm text-gray-300 mb-8 leading-relaxed opacity-90">
          Deploy specialized AI agent employees for autonomous voice outreach, WhatsApp broadcasting, factual PDF itinerary search, dynamic group pricing, payment links, and human admin escalation.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onOpenLogin}
            type="button"
            className="px-6 py-3 bg-white text-black font-bold text-xs tracking-widest hover:bg-gray-200 transition-all text-center cursor-pointer"
          >
            ENTER WORKSPACE
          </button>
          <button
            onClick={onOpenLogin}
            type="button"
            className="px-6 py-3 bg-transparent border border-white text-white font-bold text-xs tracking-widest hover:bg-white hover:text-black transition-all text-center cursor-pointer"
          >
            SIGN IN TO WORKSPACE
          </button>
        </div>
      </div>

      {/* Capabilities Features Anchor Section */}
      <div id="capabilities" className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 border-t border-white/20 pt-6">
        <div className="p-4 border border-white/20 bg-black/60">
          <h3 className="text-sm font-bold text-white mb-1">🎙️ AI VOICE CALLING</h3>
          <p className="text-xs text-gray-400">Autonomous lead outreach, qualification & speech-to-speech calls.</p>
        </div>
        <div className="p-4 border border-white/20 bg-black/60">
          <h3 className="text-sm font-bold text-white mb-1">💬 WHATSAPP MESSAGING</h3>
          <p className="text-xs text-gray-400">Broadcasting, automated follow-ups & interactive chat sessions.</p>
        </div>
        <div className="p-4 border border-white/20 bg-black/60">
          <h3 className="text-sm font-bold text-white mb-1">📚 ITINERARY RAG SEARCH</h3>
          <p className="text-xs text-gray-400">Factual PDF knowledge search with ChromaDB & multi-chunking.</p>
        </div>
        <div className="p-4 border border-white/20 bg-black/60">
          <h3 className="text-sm font-bold text-white mb-1">⚡ DYNAMIC PRICING</h3>
          <p className="text-xs text-gray-400">Automatic group discounts, Razorpay links & booking vouchers.</p>
        </div>
      </div>
    </main>
  );
}
