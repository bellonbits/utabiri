"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/game-audio";
import { useGameWallet } from "@/lib/game-wallet";

interface Sector {
  label: string;
  icon: string;
  multiplier: number;
  fixedCoins?: number;
  color: string;
}

const SECTORS: Sector[] = [
  { label: "50x 👑", icon: "👑", multiplier: 50, color: "#8a2be2" },
  { label: "Coins", icon: "🪙", multiplier: 1.5, color: "#4a148c" },
  { label: "Mystery", icon: "🎁", multiplier: 25, color: "#6a1b9a" },
  { label: "Stack", icon: "💰", multiplier: 2, color: "#4a148c" },
  { label: "Puzzle", icon: "🧩", multiplier: 10, color: "#7b1fa2" },
  { label: "1.5x", icon: "🪙", multiplier: 1.5, color: "#4a148c" },
  { label: "Diamond", icon: "💎", multiplier: 5, color: "#9c27b0" },
  { label: "+250", icon: "✨", multiplier: 0, fixedCoins: 250, color: "#4a148c" },
  { label: "Cards", icon: "🃏", multiplier: 3, color: "#6a1b9a" },
  { label: "Chest", icon: "🏆", multiplier: 12, color: "#7b1fa2" },
];

export function SpinTheWheelGame() {
  const { balance, modifyBalance } = useGameWallet();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [singleBet, setSingleBet] = useState(20);
  const [spinning, setSpinning] = useState(false);
  const [resultSector, setResultSector] = useState<Sector | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [jackpotProgress, setJackpotProgress] = useState(134);
  const [goldOrbs, setGoldOrbs] = useState(8);

  const rotationRef = useRef(0);
  const animIdRef = useRef<number | null>(null);

  // Draw the Neon Cyberpunk Wheel (Screenshot 2)
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = (canvas.width = 440);
    const h = (canvas.height = 440);
    const center = w / 2;
    const radius = center - 30;
    const numSectors = SECTORS.length;
    const arc = (2 * Math.PI) / numSectors;

    ctx.clearRect(0, 0, w, h);

    // 1. Outer Neon Glow Rim with Bulbs
    ctx.save();
    ctx.translate(center, center);

    // Glowing purple outer casing
    ctx.beginPath();
    ctx.arc(0, 0, radius + 22, 0, Math.PI * 2);
    ctx.fillStyle = "#1e0b38";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#a855f7";
    ctx.stroke();

    // Secondary inner gold bezel
    ctx.beginPath();
    ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#eab308";
    ctx.stroke();

    // Animated Glowing Bulb Lights
    const numBulbs = 20;
    const now = Date.now() / 300;
    for (let i = 0; i < numBulbs; i++) {
      const bAngle = (i * 2 * Math.PI) / numBulbs;
      const bx = Math.cos(bAngle) * (radius + 16);
      const by = Math.sin(bAngle) * (radius + 16);
      const isLit = Math.sin(now + i) > 0;

      ctx.beginPath();
      ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isLit ? "#fef08a" : "#7e22ce";
      ctx.shadowColor = isLit ? "#facc15" : "transparent";
      ctx.shadowBlur = isLit ? 10 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 2. Rotating Wheel Slices
    ctx.rotate(angle);

    for (let i = 0; i < numSectors; i++) {
      const sector = SECTORS[i];
      const startAngle = i * arc;
      const endAngle = startAngle + arc;

      // Slice background
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "#431407" : "#581c87"; // alternating royal purple / deep bronze
      if (sector.multiplier >= 25) ctx.fillStyle = "#701a75";
      ctx.fill();

      // Divider lines
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Slice Content (Icon & Text)
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Icon
      ctx.font = "24px sans-serif";
      ctx.fillText(sector.icon, radius * 0.72, 0);

      // Multiplier Label
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(sector.label, radius * 0.44, 0);

      ctx.restore();
    }

    ctx.restore(); // Exit rotation

    // 3. Center Gold Button & Outward Indicator (Screenshot 2: Pointing from center)
    ctx.save();
    ctx.translate(center, center);

    // Indicator Arrow pointing UP
    ctx.beginPath();
    ctx.moveTo(-14, -30);
    ctx.lineTo(0, -75);
    ctx.lineTo(14, -30);
    ctx.closePath();
    ctx.fillStyle = "#eab308";
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#713f12";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center Gold Circle
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fillStyle = "radial-gradient(circle, #fef08a 0%, #ca8a04 100%)";
    const radGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 42);
    radGrad.addColorStop(0, "#fef08a");
    radGrad.addColorStop(1, "#a16207");
    ctx.fillStyle = radGrad;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center Text
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#451a03";
    ctx.font = "black 14px sans-serif";
    ctx.fillText("💎 20", 0, -8);
    ctx.font = "900 16px sans-serif";
    ctx.fillText("SPIN", 0, 10);

    ctx.restore();
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, []);

  const spin = (multiplierRounds = 1) => {
    const totalCost = singleBet * multiplierRounds;
    if (spinning || totalCost > balance) return;

    setSpinning(true);
    setResultSector(null);
    setWinAmount(null);

    modifyBalance(-totalCost);

    const targetIdx = Math.floor(Math.random() * SECTORS.length);
    const targetSector = SECTORS[targetIdx];

    const numSectors = SECTORS.length;
    const arc = (2 * Math.PI) / numSectors;

    // Arrow is pointing straight UP (-PI/2)
    const targetAngle = 1.5 * Math.PI - (targetIdx * arc + arc / 2);
    const currentRot = rotationRef.current % (2 * Math.PI);
    const fullTurns = 6 * 2 * Math.PI;
    const finalAngle = rotationRef.current + fullTurns + (targetAngle - currentRot);

    const startTime = performance.now();
    const duration = 4000;
    let lastTick = rotationRef.current;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 3.8);
      const cur = rotationRef.current + (finalAngle - rotationRef.current) * ease;

      if (Math.abs(cur - lastTick) >= arc) {
        sfx.playTick();
        lastTick = cur;
      }

      drawWheel(cur);

      if (t < 1) {
        animIdRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = finalAngle % (2 * Math.PI);
        drawWheel(rotationRef.current);
        setSpinning(false);
        setResultSector(targetSector);

        let payout = 0;
        if (targetSector.fixedCoins) {
          payout = targetSector.fixedCoins * multiplierRounds;
        } else {
          payout = Math.round(totalCost * targetSector.multiplier);
        }

        setWinAmount(payout);
        if (payout > 0) {
          modifyBalance(payout);
          sfx.playWin();
          setJackpotProgress((p) => Math.min(500, p + multiplierRounds * 3));
        } else {
          sfx.playCrash();
        }
      }
    };

    animIdRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-[#1b0b2e] text-white p-4 md:p-6 shadow-2xl border border-purple-900/60">
      {/* Top Banner (Screenshot 2: 轮盘夺宝 / Fortune Wheel) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-800/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 px-4 py-1 text-base font-black tracking-wider uppercase text-white shadow-lg">
            Fortune Wheel 夺宝
          </div>
          <span className="text-xs text-purple-300 font-bold">Round #20261126</span>
        </div>

        {/* Currency Status in Top Right */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-purple-950/80 border border-purple-700 px-3 py-1 text-xs font-black text-amber-400">
            <span>💎 9</span>
            <button className="h-4 w-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
              +
            </button>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-purple-950/80 border border-purple-700 px-3 py-1 text-xs font-black text-amber-400">
            <span>🪙 {balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[140px_1fr_300px] items-center">
        {/* Left Side: Multi-Spin Shortcut Buttons (Screenshot 2: 10连转 / 50连转) */}
        <div className="flex lg:flex-col gap-3 justify-center">
          <button
            onClick={() => spin(10)}
            disabled={spinning || singleBet * 10 > balance}
            className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-indigo-700 p-3 shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50 border border-blue-400/40"
          >
            <span className="text-xs font-black text-white">10x Spins</span>
            <span className="mt-1 flex items-center gap-1 text-sm font-black text-amber-300">
              💎 {singleBet * 10}
            </span>
          </button>

          <button
            onClick={() => spin(50)}
            disabled={spinning || singleBet * 50 > balance}
            className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-amber-500 to-orange-600 p-3 shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50 border border-amber-300/40"
          >
            <span className="text-xs font-black text-slate-950">50x Mega</span>
            <span className="mt-1 flex items-center gap-1 text-sm font-black text-white">
              💎 {singleBet * 50}
            </span>
          </button>
        </div>

        {/* Center: The Neon Wheel Canvas */}
        <div className="flex flex-col items-center justify-center relative">
          <div
            onClick={() => spin(1)}
            className="cursor-pointer transition-transform hover:scale-102 active:scale-98"
          >
            <canvas ref={canvasRef} className="max-w-full drop-shadow-[0_0_35px_rgba(168,85,247,0.4)]" />
          </div>

          {resultSector && winAmount !== null && (
            <div className={`mt-3 rounded-2xl px-6 py-2.5 text-center font-black animate-bounce shadow-xl ${
              winAmount > 0
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950"
                : "bg-rose-950 border border-rose-500 text-rose-300"
            }`}>
              {winAmount > 0
                ? `WON +${winAmount} COINS! (${resultSector.icon} ${resultSector.label})`
                : "Try again! Better luck on the next spin."}
            </div>
          )}
        </div>

        {/* Right Side: Treasure Chest & Jackpot Pool (Screenshot 2) */}
        <div className="flex flex-col gap-3 rounded-2xl bg-[#261042] border border-purple-800/80 p-4 shadow-xl">
          {/* Tabs */}
          <div className="grid grid-cols-2 rounded-xl bg-[#170828] p-1 text-center text-xs font-black">
            <button className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-1.5 text-white">
              Current Pool
            </button>
            <button className="rounded-lg py-1.5 text-purple-300 hover:text-white">
              Winners Log
            </button>
          </div>

          {/* Treasure Chest Illustration & Jackpot */}
          <div className="flex items-center gap-3 bg-[#170828]/60 p-3 rounded-xl border border-purple-800/40">
            <div className="text-4xl drop-shadow-md">👑📦</div>
            <div>
              <p className="text-[10px] uppercase font-bold text-purple-300">Jackpot Grand Prize</p>
              <p className="text-lg font-black text-amber-400">3,000,000 Coins</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-purple-200">
              <span>Pool Progress</span>
              <span className="text-amber-400">{jackpotProgress} / 500</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-purple-950 overflow-hidden border border-purple-700/50">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-amber-400 transition-all duration-300"
                style={{ width: `${(jackpotProgress / 500) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-purple-400 text-right">Need {500 - jackpotProgress} more to unlock chest</p>
          </div>

          {/* Gold Orbs Counter */}
          <div className="flex items-center justify-between border-t border-purple-800/60 pt-2 text-xs">
            <span className="text-purple-300 font-bold flex items-center gap-1.5">
              <span>🟡</span> My Gold Orbs: <strong className="text-amber-300">{goldOrbs}x</strong>
            </span>
            <button className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-indigo-500">
              Check
            </button>
          </div>

          <p className="text-center text-[10px] text-purple-400">
            37 players currently participating in this round
          </p>
        </div>
      </div>
    </div>
  );
}
