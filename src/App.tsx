/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Cpu, Database, Zap, Radio, CheckCircle2, RefreshCw, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4;
const TILE_SIZE = 40;

// --- Types ---
type EntityType = 'platform' | 'electricity' | 'radiation' | 'button' | 'door' | 'collectible' | 'goal';

interface Entity {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  active?: boolean;
  targetId?: string; // For buttons to trigger doors
}

interface Player {
  id: 'fibra' | 'sinal';
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  isJumping: boolean;
  score: number;
  alive: boolean;
}

// --- Level Data ---
const LEVELS: Entity[][] = [
  // Level 1: The Facility (Harder)
  [
    { id: 'f1', type: 'platform', x: 0, y: 560, width: 800, height: 40 },
    { id: 'p1', type: 'platform', x: 0, y: 450, width: 120, height: 20 },
    { id: 'p2', type: 'platform', x: 680, y: 450, width: 120, height: 20 },
    
    // Hazards on floor
    { id: 'h1', type: 'electricity', x: 150, y: 550, width: 200, height: 10 },
    { id: 'h2', type: 'radiation', x: 450, y: 550, width: 200, height: 10 },
    
    // Middle section
    { id: 'p3', type: 'platform', x: 180, y: 350, width: 100, height: 20 },
    { id: 'p4', type: 'platform', x: 520, y: 350, width: 100, height: 20 },
    { id: 'p5', type: 'platform', x: 350, y: 250, width: 100, height: 20 },
    
    // Cross-hazards in middle
    { id: 'h3', type: 'radiation', x: 180, y: 340, width: 100, height: 5 },
    { id: 'h4', type: 'electricity', x: 520, y: 340, width: 100, height: 5 },

    { id: 'c1', type: 'collectible', x: 220, y: 300, width: 20, height: 20 },
    { id: 'c2', type: 'collectible', x: 560, y: 300, width: 20, height: 20 },
    { id: 'goal', type: 'goal', x: 350, y: 100, width: 100, height: 60 },
  ],
  // Level 2: The Core (Vertical Puzzle)
  [
    { id: 'f1', type: 'platform', x: 0, y: 560, width: 800, height: 40 },
    
    // Level 1 platforms (Lowered)
    { id: 'p1', type: 'platform', x: 100, y: 480, width: 200, height: 20 },
    { id: 'p2', type: 'platform', x: 500, y: 480, width: 200, height: 20 },
    
    // Hazards blocking paths
    { id: 'h1', type: 'electricity', x: 100, y: 470, width: 200, height: 5 },
    { id: 'h2', type: 'radiation', x: 500, y: 470, width: 200, height: 5 },
    
    // Level 2 platforms (Lowered)
    { id: 'p3', type: 'platform', x: 150, y: 320, width: 100, height: 20 },
    { id: 'p4', type: 'platform', x: 550, y: 320, width: 100, height: 20 },
    
    // Buttons on Level 2 platforms
    { id: 'b1', type: 'button', x: 600, y: 305, width: 40, height: 15, targetId: 'tp1', active: false },
    { id: 'b2', type: 'button', x: 180, y: 305, width: 40, height: 15, targetId: 'tp2', active: false },

    // Triggered Platforms (Initially inactive)
    { id: 'tp1', type: 'platform', x: 350, y: 400, width: 100, height: 20, active: false },
    { id: 'tp2', type: 'platform', x: 150, y: 220, width: 50, height: 20, active: false },

    // Final climb
    { id: 'p5', type: 'platform', x: 350, y: 180, width: 100, height: 20 },
    
    // Safe start platforms for Level 2
    { id: 'sp1', type: 'platform', x: 0, y: 540, width: 120, height: 20 },
    { id: 'sp2', type: 'platform', x: 680, y: 540, width: 120, height: 20 },
    
    // Floor hazard (only in middle now)
    { id: 'h3', type: 'electricity', x: 120, y: 550, width: 560, height: 10 },
    
    { id: 'c1', type: 'collectible', x: 400, y: 500, width: 20, height: 20 },
    { id: 'goal', type: 'goal', x: 350, y: 60, width: 100, height: 60 },
  ],
  // Level 3: The Uplink (Final Challenge)
  [
    { id: 'f1', type: 'platform', x: 0, y: 560, width: 800, height: 40 },
    
    // Starting side platforms
    { id: 'p1', type: 'platform', x: 0, y: 450, width: 150, height: 20 },
    { id: 'p2', type: 'platform', x: 650, y: 450, width: 150, height: 20 },
    
    // Hazards on floor
    { id: 'h1', type: 'electricity', x: 150, y: 550, width: 500, height: 10 },
    
    // Buttons to activate central path
    { id: 'b1', type: 'button', x: 50, y: 435, width: 40, height: 15, targetId: 'tp1', active: false },
    { id: 'b2', type: 'button', x: 710, y: 435, width: 40, height: 15, targetId: 'tp2', active: false },
    
    // Triggered Platforms
    { id: 'tp1', type: 'platform', x: 250, y: 350, width: 120, height: 20, active: false },
    { id: 'tp2', type: 'platform', x: 430, y: 350, width: 120, height: 20, active: false },
    
    // Middle hazards
    { id: 'h2', type: 'radiation', x: 250, y: 340, width: 120, height: 5 },
    { id: 'h3', type: 'electricity', x: 430, y: 340, width: 120, height: 5 },
    
    // Higher platforms
    { id: 'p3', type: 'platform', x: 350, y: 250, width: 100, height: 20 },
    
    
    { id: 'c1', type: 'collectible', x: 100, y: 500, width: 20, height: 20 },
    { id: 'c2', type: 'collectible', x: 700, y: 500, width: 20, height: 20 },
    { id: 'goal', type: 'goal', x: 350, y: 50, width: 100, height: 60 },
  ],
  // Level 4: The Singularity (The Final Test)
  [
    { id: 'f1', type: 'platform', x: 0, y: 560, width: 800, height: 40 },
    
    // Starting platforms are tiny
    { id: 'p1', type: 'platform', x: 20, y: 480, width: 60, height: 20 },
    { id: 'p2', type: 'platform', x: 720, y: 480, width: 60, height: 20 },
    
    // Floor is almost entirely hazardous
    { id: 'h1', type: 'electricity', x: 80, y: 550, width: 320, height: 10 },
    { id: 'h2', type: 'radiation', x: 400, y: 550, width: 320, height: 10 },
    
    // First set of buttons
    { id: 'b1', type: 'button', x: 30, y: 465, width: 30, height: 15, targetId: 'tp1', active: false },
    { id: 'b2', type: 'button', x: 740, y: 465, width: 30, height: 15, targetId: 'tp2', active: false },
    
    // Triggered platforms are small and high
    { id: 'tp1', type: 'platform', x: 150, y: 400, width: 60, height: 20, active: false },
    { id: 'tp2', type: 'platform', x: 590, y: 400, width: 60, height: 20, active: false },
    
    // Hazards on triggered platforms
    { id: 'h3', type: 'radiation', x: 150, y: 390, width: 60, height: 5 },
    { id: 'h4', type: 'electricity', x: 590, y: 390, width: 60, height: 5 },
    
    // Central path buttons
    { id: 'b3', type: 'button', x: 165, y: 385, width: 30, height: 15, targetId: 'tp3', active: false },
    { id: 'b4', type: 'button', x: 605, y: 385, width: 30, height: 15, targetId: 'tp4', active: false },
    
    // Central platforms
    { id: 'tp3', type: 'platform', x: 300, y: 320, width: 80, height: 20, active: false },
    { id: 'tp4', type: 'platform', x: 420, y: 320, width: 80, height: 20, active: false },
    
    // Final climb
    { id: 'p3', type: 'platform', x: 360, y: 220, width: 80, height: 20 },
    { id: 'h5', type: 'electricity', x: 360, y: 210, width: 40, height: 5 },
    { id: 'h6', type: 'radiation', x: 400, y: 210, width: 40, height: 5 },
    
    { id: 'c1', type: 'collectible', x: 400, y: 180, width: 20, height: 20 },
    { id: 'goal', type: 'goal', x: 350, y: 80, width: 100, height: 60 },
  ]
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'win'>('menu');
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [p1Skin, setP1Skin] = useState(1);
  const [p2Skin, setP2Skin] = useState(1);
  
  const p1ImgRef = useRef<HTMLImageElement | null>(null);
  const p2ImgRef = useRef<HTMLImageElement | null>(null);
  const [p1ImgUrl, setP1ImgUrl] = useState<string | null>(null);
  const [p2ImgUrl, setP2ImgUrl] = useState<string | null>(null);

  const P1_SKIN_FILES = ['pinze.png', 'dudu.png', 'netinho.png'];
  const P2_SKIN_FILES = ['bia.png', 'luiza.png', 'bea.png'];

  // Function to download a base skin template
  const downloadBaseSkin = (isP1: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const color = isP1 ? '#3b82f6' : '#facc15';
    
    // Draw a simple base character
    // Head
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(16, 4, 32, 24);
    // Visor
    ctx.fillStyle = '#333';
    ctx.fillRect(16, 4, 32, 8);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(20, 14, 24, 6);
    ctx.globalAlpha = 1.0;
    // Body
    ctx.fillStyle = color;
    ctx.fillRect(12, 28, 40, 24);
    // Arms
    ctx.fillRect(4, 28, 8, 20);
    ctx.fillRect(52, 28, 8, 20);
    // Legs
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(12, 52, 16, 12);
    ctx.fillRect(36, 52, 16, 12);

    const link = document.createElement('a');
    const fileName = isP1 ? P1_SKIN_FILES[p1Skin - 1] : P2_SKIN_FILES[p2Skin - 1];
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}skins/${P1_SKIN_FILES[p1Skin - 1]}`;
    img.onload = () => {
      p1ImgRef.current = img;
      setP1ImgUrl(img.src);
    };
    img.onerror = () => {
      // Fallback: Draw the base character to a data URL if file missing
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(8, 8, 16, 16);
        const url = canvas.toDataURL();
        const fallbackImg = new Image();
        fallbackImg.src = url;
        fallbackImg.onload = () => {
          p1ImgRef.current = fallbackImg;
          setP1ImgUrl(url);
        };
      }
    };
  }, [p1Skin]);

  useEffect(() => {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}skins/${P2_SKIN_FILES[p2Skin - 1]}`;
    img.onload = () => {
      p2ImgRef.current = img;
      setP2ImgUrl(img.src);
    };
    img.onerror = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(8, 8, 16, 16);
        const url = canvas.toDataURL();
        const fallbackImg = new Image();
        fallbackImg.src = url;
        fallbackImg.onload = () => {
          p2ImgRef.current = fallbackImg;
          setP2ImgUrl(url);
        };
      }
    };
  }, [p2Skin]);

  // Game state refs for the loop
  const playersRef = useRef<Player[]>([
    { id: 'fibra', x: 50, y: 500, vx: 0, vy: 0, width: 30, height: 30, color: '#3b82f6', isJumping: false, score: 0, alive: true },
    { id: 'sinal', x: 720, y: 500, vx: 0, vy: 0, width: 30, height: 30, color: '#facc15', isJumping: false, score: 0, alive: true },
  ]);
  const entitiesRef = useRef<Entity[]>(JSON.parse(JSON.stringify(LEVELS[0])));
  const keysRef = useRef<Record<string, boolean>>({});

  const resetGame = (levelIndex: number = 0) => {
    playersRef.current = [
      { id: 'fibra', x: 50, y: 500, vx: 0, vy: 0, width: 30, height: 30, color: '#3b82f6', isJumping: false, score: 0, alive: true },
      { id: 'sinal', x: 720, y: 500, vx: 0, vy: 0, width: 30, height: 30, color: '#facc15', isJumping: false, score: 0, alive: true },
    ];
    entitiesRef.current = JSON.parse(JSON.stringify(LEVELS[levelIndex]));
    setCurrentLevel(levelIndex);
    if (levelIndex === 0) setScore(0);
    setGameState('playing');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const update = () => {
      const players = playersRef.current;
      const entities = entitiesRef.current;

      // Update Players
      players.forEach(p => {
        if (!p.alive) return;

        // Input
        if (p.id === 'fibra') {
          if (keysRef.current['KeyA']) p.vx = -MOVE_SPEED;
          else if (keysRef.current['KeyD']) p.vx = MOVE_SPEED;
          else p.vx = 0;

          if (keysRef.current['KeyW'] && !p.isJumping) {
            p.vy = JUMP_FORCE;
            p.isJumping = true;
          }
        } else {
          if (keysRef.current['ArrowLeft']) p.vx = -MOVE_SPEED;
          else if (keysRef.current['ArrowRight']) p.vx = MOVE_SPEED;
          else p.vx = 0;

          if (keysRef.current['ArrowUp'] && !p.isJumping) {
            p.vy = JUMP_FORCE;
            p.isJumping = true;
          }
        }

        // Physics
        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;

        // Boundary
        if (p.x < 0) p.x = 0;
        if (p.x + p.width > CANVAS_WIDTH) p.x = CANVAS_WIDTH - p.width;

        // Collisions
        p.isJumping = true; // Assume jumping unless on platform
        
        entities.forEach(e => {
          // AABB Collision
          if (p.x < e.x + e.width && p.x + p.width > e.x && p.y < e.y + e.height && p.y + p.height > e.y) {
            
            if (e.type === 'platform' && e.active !== false) {
              // Resolve vertical collision
              if (p.vy > 0 && p.y + p.height - p.vy <= e.y) {
                p.y = e.y - p.height;
                p.vy = 0;
                p.isJumping = false;
              } else if (p.vy < 0 && p.y - p.vy >= e.y + e.height) {
                p.y = e.y + e.height;
                p.vy = 0;
              } else {
                // Horizontal collision
                if (p.vx > 0) p.x = e.x - p.width;
                else if (p.vx < 0) p.x = e.x + e.width;
              }
            }

            if (e.type === 'button') {
              e.active = true;
              if (e.targetId) {
                const target = entities.find(ent => ent.id === e.targetId);
                if (target) target.active = true;
              }
            }

            if (e.type === 'electricity' && p.id === 'sinal') {
              p.alive = false;
              setGameState('gameover');
            }

            if (e.type === 'radiation' && p.id === 'fibra') {
              p.alive = false;
              setGameState('gameover');
            }

            if (e.type === 'collectible') {
              // Remove collectible
              entitiesRef.current = entities.filter(ent => ent.id !== e.id);
              setScore(s => s + 1);
            }
          }
        });

        // Player-to-Player Collision
        players.forEach(other => {
          if (p.id !== other.id && other.alive) {
            if (p.x < other.x + other.width && p.x + p.width > other.x && p.y < other.y + other.height && p.y + p.height > other.y) {
              // Resolve vertical collision
              if (p.vy > 0 && p.y + p.height - p.vy <= other.y) {
                p.y = other.y - p.height;
                p.vy = 0;
                p.isJumping = false;
              } else if (p.vy < 0 && p.y - p.vy >= other.y + other.height) {
                p.y = other.y + other.height;
                p.vy = 0;
              } else {
                // Horizontal collision
                if (p.vx > 0) p.x = other.x - p.width;
                else if (p.vx < 0) p.x = other.x + other.width;
              }
            }
          }
        });

        // Check if both players are at goal
        const goal = entities.find(e => e.type === 'goal');
        if (goal) {
          const p1AtGoal = players[0].x < goal.x + goal.width && players[0].x + players[0].width > goal.x && players[0].y < goal.y + goal.height && players[0].y + players[0].height > goal.y;
          const p2AtGoal = players[1].x < goal.x + goal.width && players[1].x + players[1].width > goal.x && players[1].y < goal.y + goal.height && players[1].y + players[1].height > goal.y;
          
          if (p1AtGoal && p2AtGoal) {
            if (currentLevel < LEVELS.length - 1) {
              resetGame(currentLevel + 1);
            } else {
              setGameState('win');
            }
          }
        }
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Grid effect
      ctx.strokeStyle = 'rgba(153, 27, 27, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < CANVAS_WIDTH; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke();
      }
      for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke();
      }

      // Entities
      entitiesRef.current.forEach(e => {
        if (e.type === 'platform') {
          if (e.active === false) {
            // Draw ghost platform
            ctx.strokeStyle = 'rgba(64, 64, 64, 0.3)';
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(e.x, e.y, e.width, e.height);
            ctx.setLineDash([]);
            return;
          }
          ctx.fillStyle = '#262626';
          ctx.fillRect(e.x, e.y, e.width, e.height);
          ctx.strokeStyle = '#404040';
          ctx.strokeRect(e.x, e.y, e.width, e.height);
        } else if (e.type === 'button') {
          ctx.fillStyle = e.active ? '#10b981' : '#ef4444';
          ctx.fillRect(e.x, e.y, e.width, e.height);
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(e.x, e.y, e.width, e.height);
        } else if (e.type === 'electricity') {
          ctx.fillStyle = '#3b82f6';
          ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.2;
          ctx.fillRect(e.x, e.y, e.width, e.height);
          ctx.globalAlpha = 1;
        } else if (e.type === 'radiation') {
          ctx.fillStyle = '#facc15';
          ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 100) * 0.2;
          ctx.fillRect(e.x, e.y, e.width, e.height);
          ctx.globalAlpha = 1;
        } else if (e.type === 'collectible') {
          ctx.fillStyle = '#991b1b';
          ctx.beginPath();
          ctx.arc(e.x + e.width / 2, e.y + e.height / 2, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        } else if (e.type === 'goal') {
          // Router Body
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(e.x, e.y + 20, e.width, e.height - 20);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.strokeRect(e.x, e.y + 20, e.width, e.height - 20);

          // Antennas
          ctx.strokeStyle = '#404040';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(e.x + 20, e.y + 20);
          ctx.lineTo(e.x + 10, e.y);
          ctx.moveTo(e.x + e.width - 20, e.y + 20);
          ctx.lineTo(e.x + e.width - 10, e.y);
          ctx.stroke();

          // Blinking Lights
          const blink = Math.floor(Date.now() / 500) % 2 === 0;
          ctx.fillStyle = blink ? '#10b981' : '#064e3b';
          ctx.beginPath();
          ctx.arc(e.x + 20, e.y + 35, 3, 0, Math.PI * 2);
          ctx.arc(e.x + 35, e.y + 35, 3, 0, Math.PI * 2);
          ctx.arc(e.x + 50, e.y + 35, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px font-mono';
          ctx.fillText('ETECC ROUTER', e.x + 15, e.y + 55);
        }
      });

      // Players
      playersRef.current.forEach(p => {
        if (!p.alive) return;
        
        const img = p.id === 'fibra' ? p1ImgRef.current : p2ImgRef.current;
        
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx.drawImage(img, p.x, p.y, p.width, p.height);
        } else {
          // Fallback to pixel art if image not loaded
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.width, p.height);
        }
      });

      animationId = requestAnimationFrame(() => {
        update();
        draw();
      });
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [gameState, currentLevel]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col items-center justify-center p-4">
      {/* HUD */}
      <div className="w-full max-w-[800px] flex justify-between items-center mb-4 px-4 py-2 bg-[#1a1a1a] border border-[#991b1b]/30 rounded-lg shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-xs font-mono uppercase tracking-wider text-blue-400">Fibra (WASD)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
            <span className="text-xs font-mono uppercase tracking-wider text-yellow-400">Sinal (Arrows)</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#991b1b]">
          <Database size={16} />
          <span className="font-mono text-lg font-bold">LVL {currentLevel + 1} | {score} PKTS</span>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative border-4 border-[#262626] rounded-xl overflow-hidden shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block"
        />

        {/* Overlay Screens */}
        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="mb-8"
              >
                <h1 className="text-6xl font-black tracking-tighter text-[#991b1b] mb-2 uppercase italic">
                  Etecc Link
                </h1>
                <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">
                  Fiber & Signal Protocol
                </p>
              </motion.div>

              <div className="grid grid-cols-2 gap-8 mb-8 max-w-2xl">
                <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-blue-500/30">
                  <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center mb-4 mx-auto relative overflow-hidden bg-[#2a2a2a] border border-blue-500/20">
                    {p1ImgUrl ? (
                      <img src={p1ImgUrl} alt="P1 Skin" className="w-12 h-12 object-contain" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-500 rounded animate-pulse" />
                    )}
                  </div>
                  <h3 className="font-bold mb-3 text-blue-400">FIBRA (P1)</h3>
                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {[1, 2, 3].map(s => (
                      <button
                        key={s}
                        onClick={() => setP1Skin(s)}
                        className={`py-1.5 rounded-lg border transition-all ${
                          p1Skin === s 
                          ? 'border-blue-500 bg-blue-500/20 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                          : 'border-white/5 bg-black/20 text-gray-500 hover:border-white/20'
                        } text-[10px] font-bold`}
                      >
                        {['PINZE', 'DUDU', 'NETINHO'][s-1]}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed mb-4 px-2">
                    Resistente à <span className="text-blue-400">Eletricidade</span>.
                    Morre em <span className="text-yellow-400">Radiação</span>.
                  </p>
                  <div className="flex justify-center gap-1">
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-[10px] border border-white/5">W</kbd>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-[10px] border border-white/5">A</kbd>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-[10px] border border-white/5">S</kbd>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-[10px] border border-white/5">D</kbd>
                  </div>
                  <button 
                    onClick={() => downloadBaseSkin(true)}
                    className="mt-4 text-[9px] text-blue-400/60 hover:text-blue-400 underline uppercase tracking-widest"
                  >
                    Baixar Base PNG (P1)
                  </button>
                </div>

                <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-yellow-500/30 shadow-xl">
                  <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center mb-4 mx-auto relative overflow-hidden bg-[#2a2a2a] border border-yellow-500/20">
                    {p2ImgUrl ? (
                      <img src={p2ImgUrl} alt="P2 Skin" className="w-12 h-12 object-contain" />
                    ) : (
                      <div className="w-10 h-10 bg-yellow-500 rounded animate-pulse" />
                    )}
                  </div>
                  <h3 className="font-bold mb-3 text-yellow-400">SINAL (P2)</h3>
                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {[1, 2, 3].map(s => (
                      <button
                        key={s}
                        onClick={() => setP2Skin(s)}
                        className={`py-1.5 rounded-lg border transition-all ${
                          p2Skin === s 
                          ? 'border-yellow-500 bg-yellow-500/20 text-white shadow-[0_0_10px_rgba(250,204,21,0.3)]' 
                          : 'border-white/5 bg-black/20 text-gray-500 hover:border-white/20'
                        } text-[10px] font-bold`}
                      >
                        {['BIA', 'LUIZA', 'BEA'][s-1]}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed mb-4 px-2">
                    Resistente à <span className="text-yellow-400">Radiação</span>.
                    Morre em <span className="text-blue-400">Eletricidade</span>.
                  </p>
                  <div className="flex justify-center gap-1">
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-[10px] border border-white/5">↑</kbd>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-[10px] border border-white/5">←</kbd>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-[10px] border border-white/5">↓</kbd>
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-[10px] border border-white/5">→</kbd>
                  </div>
                  <button 
                    onClick={() => downloadBaseSkin(false)}
                    className="mt-4 text-[9px] text-yellow-400/60 hover:text-yellow-400 underline uppercase tracking-widest"
                  >
                    Baixar Base PNG (P2)
                  </button>
                </div>
              </div>

              <div className="mb-8 w-full max-w-md">
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Selecionar Setor</p>
                <div className="grid grid-cols-4 gap-2">
                  {LEVELS.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentLevel(idx)}
                      className={`py-2 rounded-lg font-mono text-sm transition-all ${
                        currentLevel === idx 
                        ? 'bg-[#991b1b] text-white border border-white/20' 
                        : 'bg-[#1a1a1a] text-gray-500 border border-white/5 hover:border-white/20'
                      }`}
                    >
                      S{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => resetGame(currentLevel)}
                className="group relative px-12 py-4 bg-[#991b1b] hover:bg-[#7f1d1d] transition-all rounded-full font-bold text-xl flex items-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                <Play size={24} fill="currentColor" />
                INICIAR LINK
              </button>
            </motion.div>
          )}

          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Zap size={40} />
              </div>
              <h2 className="text-5xl font-black text-white mb-4 uppercase italic">Link Interrompido</h2>
              <p className="text-red-200 mb-8 max-w-md">
                Um dos agentes foi desconectado por interferência ambiental. 
                A sincronização falhou.
              </p>
              <button
                onClick={() => resetGame(currentLevel)}
                className="px-8 py-3 bg-white text-red-950 hover:bg-red-100 transition-colors rounded-full font-bold flex items-center gap-2"
              >
                <RefreshCw size={20} />
                RECONECTAR
              </button>
            </motion.div>
          )}

          {gameState === 'win' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              >
                <CheckCircle2 size={48} className="text-white" />
              </motion.div>
              
              <h2 className="text-6xl font-black text-white mb-2 uppercase italic tracking-tighter">Missão Cumprida</h2>
              <p className="text-emerald-400 font-mono text-sm tracking-[0.3em] uppercase mb-8">Link Global Estabelecido</p>
              
              <div className="bg-black/40 p-6 rounded-2xl border border-emerald-500/20 mb-10 max-w-lg w-full">
                <p className="text-emerald-100 mb-6 leading-relaxed">
                  Parabéns! Você sincronizou com sucesso os protocolos de Fibra e Sinal através de todos os setores críticos. 
                  A infraestrutura da Etecc está agora operando em 100% de eficiência.
                </p>
                
                <div className="space-y-4 text-xs font-mono uppercase tracking-widest text-emerald-400/60">
                  <div>
                    <p className="text-emerald-300 mb-1">Desenvolvimento</p>
                    <p> dropa no pombo </p>
                  </div>
                  <div>
                    <p className="text-emerald-300 mb-1">Agradecimentos Especiais</p>
                    <p>I.A. Studios</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-white font-bold text-xl mb-2">Obrigado por jogar!</p>
                <button
                  onClick={() => resetGame(0)}
                  className="px-10 py-4 bg-white text-emerald-950 hover:bg-emerald-100 transition-all hover:scale-105 active:scale-95 rounded-full font-bold flex items-center justify-center gap-2 shadow-xl"
                >
                  <RefreshCw size={20} />
                  REINICIAR DO SETOR 1
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-mono uppercase tracking-[0.2em] mb-4">
          <Cpu size={14} />
          <span>Etecc Systems v2.5.0</span>
        </div>
        <p className="text-gray-600 text-[10px] max-w-sm">
          Aviso: Este ambiente contém altos níveis de radiação de micro-ondas e correntes elétricas expostas. 
          Use os agentes Fibra e Sinal para navegação segura.
        </p>
      </div>
    </div>
  );
}
