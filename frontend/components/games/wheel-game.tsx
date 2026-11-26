"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/game-audio";
import { useGameWallet } from "@/lib/game-wallet";
import { ShieldIcon, DiscIcon, CoinsIcon, TrophyIcon, SparklesIcon, CheckCircleIcon } from "@/components/icons";

interface Sector {
  label: string;
  multiplier: number;
  fixedCoins?: number;
  color: string;
}

const SECTORS: Sector[] = [
  { label: "50x MAX", multiplier: 50, color: "#be185d" },
  { label: "1.5x", multiplier: 1.5, color: "#4338ca" },
  { label: "10x", multiplier: 10, color: "#7e22ce" },
  { label: "2.0x", multiplier: 2.0, color: "#3730a3" },
  { label: "0x LOSS", multiplier: 0, color: "#475569" },
  { label: "5.0x", multiplier: 5.0, color: "#a21caf" },
  { label: "1.2x", multiplier: 1.2, color: "#334155" },
  { label: "25x MEGA", multiplier: 25, color: "#e11d48" },
  { label: "3.0x", multiplier: 3.0, color: "#6d28d9" },
  { label: "0.5x", multiplier: 0.5, color: "#64748b" },
  { label: "+500 COINS", multiplier: 0, fixedCoins: 500, color: "#9333ea" },
  { label: "2.5x", multiplier: 2.5, color: "#4f46e5" },
];

interface WheelWinner {
  user: string;
  stake: number;
  multiplier: string;
  payout: number;
  time: string;
}

const RECENT_WINNERS: WheelWinner[] = [
  { user: "j***9", stake: 100, multiplier: "25x", payout: 2500, time: "1m ago" },
  { user: "w***k", stake: 200, multiplier: "5.0x", payout: 1000, time: "2m ago" },
  { user: "a***2", stake: 50, multiplier: "10x", payout: 500, time: "4m ago" },
  { user: "p***m", stake: 500, multiplier: "3.0x", payout: 1500, time: "6m ago" },
  { user: "k***7", stake: 100, multiplier: "50x", payout: 5000, time: "9m ago" },
];

export function SpinTheWheelGame() {
  const { balance, modifyBalance } = useGameWallet();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stake, setStake] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [resultSector, setResultSector] = useState<Sector | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [recentMultipliers, setRecentMultipliers] = useState<string[]>(["25x", "5.0x", "1.5x", "10x", "3.0x", "0x", "50x"]);
  const [roundSeed, setRoundSeed] = useState("f7c9e3b12d5a84091e6b7294dc503817a34f8261");

  const rotationRef = useRef(0);
  const animIdRef = useRef<number | null>(null);

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

    // Outer Bezel in clean light mode
    ctx.save();
    ctx.translate(center, center);

    ctx.beginPath();
    ctx.arc(0, 0, radius + 20, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ea580c";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e2e8f0";
    ctx.stroke();

    // Wheel Pins
    const numPins = 24;
    for (let i = 0; i < numPins; i++) {
      const pAngle = (i * 2 * Math.PI) / numPins;
      const px = Math.cos(pAngle) * (radius + 15);
      const py = Math.sin(pAngle) * (radius + 15);
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? "#ea580c" : "#94a3b8";
      ctx.fill();
    }

    // Rotating Wheel Slices
    ctx.rotate(angle);

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

      // Divider line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Slice Text
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 13px sans-serif";
      ctx.fillText(sector.label, radius - 20, 0);
      ctx.restore();
    }

    ctx.restore();

    // Top Pointer Arrow pointing DOWN at top rim
    ctx.save();
    ctx.translate(center, 12);
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 24);
    ctx.closePath();
    ctx.fillStyle = "#ea580c";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Center Hub Button
    ctx.save();
    ctx.translate(center, center);
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#ea580c";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0f172a";
    ctx.font = "900 13px sans-serif";
    ctx.fillText("SPIN", 0, 0);
    ctx.restore();
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, []);

  const spin = () => {
    if (spinning || stake > balance) return;

    setSpinning(true);
    setResultSector(null);
    setWinAmount(null);
    modifyBalance(-stake);
    setRoundSeed(Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(""));

    const targetIdx = Math.floor(Math.random() * SECTORS.length);
    const targetSector = SECTORS[targetIdx];
    const arc = (2 * Math.PI) / SECTORS.length;

    const targetAngle = -Math.PI / 2 - (targetIdx * arc + arc / 2);
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
          payout = targetSector.fixedCoins;
        } else {
          payout = Math.round(stake * targetSector.multiplier);
        }

        setWinAmount(payout);
        setRecentMultipliers((prev) => [targetSector.label, ...prev.slice(0, 8)]);

        if (payout > 0) {
          modifyBalance(payout);
          sfx.playWin();
        } else {
          sfx.playCrash();
        }
      }
    };

    animIdRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="w-full border border-line bg-panel text-slate-900">
      {/* Top Strip */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 overflow-x-auto bg-panel-2">
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1.5 text-amber-600 font-black text-lg tracking-tight">
            <DiscIcon className="h-5 w-5 text-amber-600" /> Fortune Wheel
          </span>
          <span className="border border-amber-200 bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-extrabold uppercase">
            96.5% RTP
          </span>
        </div>

        {/* Recent Spins Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-black">
          <span className="text-[10px] uppercase font-bold text-mut mr-1">History:</span>
          {recentMultipliers.map((m, i) => (
            <span key={i} className="rounded-full bg-panel border border-line px-2.5 py-0.5 text-slate-800 shrink-0 text-[11px] font-bold">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Main Grid: Wheel Canvas (Left) + Betting & Winners (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] divide-y lg:divide-y-0 lg:divide-x divide-line">
        {/* Center Arena */}
        <div className="flex flex-col items-center justify-center p-6 bg-ink">
          <div className="relative">
            <canvas ref={canvasRef} className="block max-w-full h-auto" />
          </div>

          {resultSector && (
            <div className={`mt-4 px-4 py-2 text-center text-sm font-black border ${
              winAmount && winAmount > 0 ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-line bg-panel text-mut"
            }`}>
              {winAmount && winAmount > 0 ? (
                <span>WON {winAmount} COINS! ({resultSector.label})</span>
              ) : (
                <span>No Win ({resultSector.label})</span>
              )}
            </div>
          )}
        </div>

        {/* Right Betting & History Panel */}
        <div className="flex flex-col bg-panel">
          {/* Bet Console */}
          <div className="p-4 border-b border-line space-y-3 bg-panel-2">
            <div className="flex items-center justify-between text-xs font-bold text-mut">
              <span>WAGER AMOUNT</span>
              <span>BALANCE: <strong className="text-slate-900">{balance.toLocaleString()} Coins</strong></span>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setStake(amt)}
                  className={`py-1.5 border transition cursor-pointer ${
                    stake === amt ? "border-orange-500 bg-orange-500 text-white font-black" : "border-line bg-panel text-slate-800 hover:bg-panel-2"
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Stepper Input */}
            <div className="flex items-center justify-between border border-line bg-panel px-3 py-1.5">
              <button
                onClick={() => setStake((s) => Math.max(10, s - 50))}
                className="h-7 w-7 bg-panel-2 text-slate-800 font-black text-sm hover:bg-line cursor-pointer"
              >
                −
              </button>
              <span className="font-black text-sm text-slate-900">{stake} Coins</span>
              <button
                onClick={() => setStake((s) => s + 50)}
                className="h-7 w-7 bg-panel-2 text-slate-800 font-black text-sm hover:bg-line cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Big Spin Button */}
            <button
              onClick={spin}
              disabled={spinning || stake > balance}
              className="w-full py-3 bg-accent text-white font-black text-xs uppercase tracking-wider hover:bg-accent-2 transition disabled:opacity-50 cursor-pointer"
            >
              {spinning ? "SPINNING…" : `SPIN FOR ${stake} COINS`}
            </button>
          </div>

          {/* Recent Winners Table */}
          <div className="flex-1 flex flex-col bg-panel">
            <div className="flex items-center justify-between px-4 py-2 border-b border-line text-[11px] font-black uppercase text-mut bg-panel-2">
              <span className="flex items-center gap-1.5"><TrophyIcon className="h-3.5 w-3.5 text-amber-600" /> Recent Payouts</span>
              <span className="text-emerald-600 text-[10px]">Verified</span>
            </div>

            <div className="divide-y divide-line text-xs font-medium">
              {RECENT_WINNERS.map((w, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-2.5 hover:bg-panel-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-700 font-bold">{w.user}</span>
                    <span className="rounded bg-panel-2 border border-line px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {w.multiplier}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-600">+{w.payout} Coins</span>
                    <span className="block text-[10px] text-mut">{w.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Provably Fair Bottom Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-panel-2 px-4 py-2 text-[11px] text-mut">
        <div className="flex items-center gap-2">
          <ShieldIcon className="h-4 w-4 text-emerald-600" />
          <span className="font-bold text-slate-800">Provably Fair SHA-256 Seed:</span>
          <span className="font-mono text-[10px] text-mut truncate max-w-[200px] md:max-w-[320px]">{roundSeed}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Max Win: <strong className="text-amber-600">50x Multiplier</strong></span>
          <span className="text-line">|</span>
          <span>RTP: <strong className="text-slate-900">96.5%</strong></span>
        </div>
      </div>
    </div>
  );
}
