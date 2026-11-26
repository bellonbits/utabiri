"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/game-audio";
import { useGameWallet } from "@/lib/game-wallet";

interface Sector {
  label: string;
  multiplier: number;
  fixedCoins?: number;
  color: string;
  textColor: string;
}

const SECTORS: Sector[] = [
  { label: "50x 👑", multiplier: 50, color: "#f59e0b", textColor: "#0f172a" },
  { label: "1.5x", multiplier: 1.5, color: "#3b82f6", textColor: "#ffffff" },
  { label: "TRY AGAIN", multiplier: 0, color: "#64748b", textColor: "#ffffff" },
  { label: "3x", multiplier: 3, color: "#10b981", textColor: "#ffffff" },
  { label: "+100 COINS", multiplier: 0, fixedCoins: 100, color: "#8b5cf6", textColor: "#ffffff" },
  { label: "2x", multiplier: 2, color: "#06b6d4", textColor: "#ffffff" },
  { label: "10x ⭐", multiplier: 10, color: "#ec4899", textColor: "#ffffff" },
  { label: "1.2x", multiplier: 1.2, color: "#6366f1", textColor: "#ffffff" },
  { label: "5x 🔥", multiplier: 5, color: "#f97316", textColor: "#ffffff" },
  { label: "+250 COINS", multiplier: 0, fixedCoins: 250, color: "#14b8a6", textColor: "#ffffff" },
  { label: "2x", multiplier: 2, color: "#0ea5e9", textColor: "#ffffff" },
  { label: "25x 💎", multiplier: 25, color: "#a855f7", textColor: "#ffffff" },
];

export function SpinTheWheelGame() {
  const { balance, modifyBalance } = useGameWallet();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [betAmount, setBetAmount] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [resultSector, setResultSector] = useState<Sector | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [spinHistory, setSpinHistory] = useState<Sector[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Rotation physics state
  const rotationRef = useRef(0);
  const animIdRef = useRef<number | null>(null);

  const toggleSound = () => {
    sfx.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = Math.min(canvas.width, canvas.height);
    const center = size / 2;
    const radius = center - 20;
    const numSectors = SECTORS.length;
    const arc = (2 * Math.PI) / numSectors;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);

    // Outer ring shadow and border
    ctx.beginPath();
    ctx.arc(0, 0, radius + 12, 0, Math.PI * 2);
    ctx.fillStyle = "#1e293b";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b"; // Gold rim
    ctx.fill();

    // Slices
    for (let i = 0; i < numSectors; i++) {
      const sector = SECTORS[i];
      const startAngle = i * arc;
      const endAngle = startAngle + arc;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = sector.color;
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = sector.textColor;
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(sector.label, radius - 24, 5);
      ctx.restore();
    }

    // Outer bulb pegs
    for (let i = 0; i < numSectors * 2; i++) {
      const pegAngle = (i * Math.PI) / numSectors;
      const pegX = Math.cos(pegAngle) * (radius + 4);
      const pegY = Math.sin(pegAngle) * (radius + 4);
      ctx.beginPath();
      ctx.arc(pegX, pegY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }

    // Center Hub
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", 0, 0);

    ctx.restore();

    // Top Pointer Arrow (fixed at top pointing down)
    ctx.save();
    ctx.translate(center, 12);
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(16, 0);
    ctx.lineTo(0, 28);
    ctx.closePath();
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, []);

  const spinWheel = () => {
    if (spinning || betAmount > balance) return;

    setSpinning(true);
    setResultSector(null);
    setWinAmount(null);

    // Deduct bet
    modifyBalance(-betAmount);

    // Determine target sector
    const targetIdx = Math.floor(Math.random() * SECTORS.length);
    const targetSector = SECTORS[targetIdx];

    const numSectors = SECTORS.length;
    const arc = (2 * Math.PI) / numSectors;

    // Angle calculations: Pointer is at top (-PI/2)
    // To land on targetIdx, the wheel's rotation must align targetIdx with top
    const targetAngle = 1.5 * Math.PI - (targetIdx * arc + arc / 2);
    const currentRot = rotationRef.current % (2 * Math.PI);
    // Add 5 to 8 full revolutions for realistic spin duration
    const fullTurns = 6 * 2 * Math.PI;
    const finalAngle = rotationRef.current + fullTurns + (targetAngle - currentRot);

    const startTime = performance.now();
    const duration = 4500; // 4.5 seconds spin
    let lastTickAngle = rotationRef.current;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(1, elapsed / duration);

      // Ease out cubic deceleration
      const easeOut = 1 - Math.pow(1 - t, 3.5);
      const current = rotationRef.current + (finalAngle - rotationRef.current) * easeOut;

      // Play tick sound whenever a sector boundary crosses top pointer
      if (Math.abs(current - lastTickAngle) >= arc) {
        sfx.playTick();
        lastTickAngle = current;
      }

      drawWheel(current);

      if (t < 1) {
        animIdRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = finalAngle % (2 * Math.PI);
        drawWheel(rotationRef.current);
        setSpinning(false);
        setResultSector(targetSector);
        setSpinHistory((h) => [targetSector, ...h.slice(0, 5)]);

        // Calculate payout
        let win = 0;
        if (targetSector.fixedCoins) {
          win = targetSector.fixedCoins;
        } else if (targetSector.multiplier > 0) {
          win = Math.round(betAmount * targetSector.multiplier);
        }

        setWinAmount(win);
        if (win > 0) {
          modifyBalance(win);
          sfx.playWin();
        } else {
          sfx.playCrash();
        }
      }
    };

    animIdRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Sound & History header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <span className="text-mut-2 uppercase tracking-wider text-[11px] mr-1">Recent:</span>
          {spinHistory.map((s, idx) => (
            <span
              key={idx}
              className="rounded-full px-2.5 py-0.5 text-white font-extrabold text-xs shadow-xs"
              style={{ backgroundColor: s.color }}
            >
              {s.label}
            </span>
          ))}
          {spinHistory.length === 0 && <span className="text-xs text-mut-2">Spin to see outcomes</span>}
        </div>

        <button
          onClick={toggleSound}
          className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:bg-panel-2"
        >
          {soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-center">
        {/* Wheel Canvas Stage */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-panel p-6 shadow-sm min-h-[460px]">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="max-w-full drop-shadow-2xl select-none"
          />

          {resultSector && winAmount !== null && (
            <div className={`mt-4 rounded-xl px-6 py-2.5 text-center font-black animate-bounce ${
              winAmount > 0 ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500" : "bg-rose-500/15 text-rose-600 border border-rose-500"
            }`}>
              {winAmount > 0
                ? `WON +${winAmount} COINS! (${resultSector.label})`
                : "No win this time — Try again!"}
            </div>
          )}
        </div>

        {/* Bet & Wheel Controls */}
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <h3 className="text-base font-extrabold tracking-tight">Fortune Wheel Stakes</h3>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-mut-2">
              Bet Amount (Coins)
            </label>
            <div className="mt-1 flex items-center rounded-xl border border-line bg-panel-2 px-3 py-2">
              <input
                type="number"
                min="10"
                step="10"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, parseInt(e.target.value) || 10))}
                disabled={spinning}
                className="w-full bg-transparent text-xl font-black outline-none"
              />
            </div>
          </div>

          {/* Quick Bet Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 100, 250].map((amt) => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={spinning}
                className={`rounded-lg border border-line py-2 text-xs font-extrabold transition ${
                  betAmount === amt ? "bg-accent text-white" : "bg-panel-2 hover:bg-ink"
                }`}
              >
                {amt}
              </button>
            ))}
          </div>

          {/* Wheel Payout Guide */}
          <div className="rounded-xl border border-line/60 bg-panel-2 p-3 text-xs">
            <p className="font-bold text-slate-800 mb-2">High Value Segments:</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 50x Mega Jackpot
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> 25x Diamond
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-pink-500" /> 10x Gold Star
              </div>
              <div className="flex items-center gap-1.5 font-bold">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> 5x Fire Multiplier
              </div>
            </div>
          </div>

          <button
            onClick={spinWheel}
            disabled={spinning || betAmount > balance}
            className={`w-full rounded-xl py-4 text-center text-lg font-black transition shadow-md active:scale-98 ${
              spinning
                ? "bg-slate-400 text-white cursor-not-allowed"
                : "bg-amber-500 text-slate-900 hover:bg-amber-400"
            } disabled:opacity-50`}
          >
            {spinning ? "SPINNING..." : `SPIN FOR ${betAmount} COINS`}
          </button>
        </div>
      </div>
    </div>
  );
}
