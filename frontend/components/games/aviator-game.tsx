"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/game-audio";
import { useGameWallet } from "@/lib/game-wallet";

type GameState = "WAITING" | "FLYING" | "CRASHED";

interface BetConsoleState {
  amount: number;
  active: boolean;
  cashedOut: boolean;
  cashedMultiplier: number;
  mode: "bet" | "auto";
  autoCashoutValue: number;
}

interface PlayerBet {
  username: string;
  avatar: string;
  bet: number;
  cashedAt?: number;
  profit?: number;
}

const INITIAL_PLAYERS: PlayerBet[] = [
  { username: "b***u", avatar: "👤", bet: 96.15, cashedAt: 1.10, profit: 105.76 },
  { username: "u***k", avatar: "🦁", bet: 50.80 },
  { username: "m***r", avatar: "⭐", bet: 49.27 },
  { username: "1****", avatar: "🕶️", bet: 40.46 },
  { username: "r***k", avatar: "🚀", bet: 39.77 },
  { username: "r***k", avatar: "🎯", bet: 39.77 },
  { username: "4***3", avatar: "🦅", bet: 39.77 },
  { username: "4***5", avatar: "🍉", bet: 39.77 },
  { username: "4***5", avatar: "🍉", bet: 39.77 },
  { username: "1***4", avatar: "⚡", bet: 39.77 },
  { username: "1***4", avatar: "⚡", bet: 39.77 },
  { username: "1****", avatar: "🕶️", bet: 30.34 },
  { username: "4***5", avatar: "🍓", bet: 28.41, cashedAt: 1.11, profit: 31.53 },
  { username: "4***5", avatar: "🍓", bet: 27.27, cashedAt: 1.56, profit: 42.54 },
  { username: "d***d", avatar: "🕶️", bet: 26.70 },
  { username: "d***d", avatar: "🕶️", bet: 26.70 },
];

export function AviatorGame() {
  const { balance, modifyBalance } = useGameWallet();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<GameState>("WAITING");
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(4);
  const [history, setHistory] = useState<number[]>([
    2.08, 3.99, 2.06, 3.46, 1.83, 2.02, 4.06, 1.08, 4.59, 1.00, 6.73, 1.04, 6.73, 1.95,
  ]);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"all" | "my" | "top">("all");
  const [players, setPlayers] = useState<PlayerBet[]>(INITIAL_PLAYERS);

  // Bet Consoles (Dual Panels from Screenshot 1)
  const [panel1, setPanel1] = useState<BetConsoleState>({
    amount: 100,
    active: false,
    cashedOut: false,
    cashedMultiplier: 0,
    mode: "bet",
    autoCashoutValue: 2.0,
  });

  const [panel2, setPanel2] = useState<BetConsoleState>({
    amount: 50,
    active: false,
    cashedOut: false,
    cashedMultiplier: 0,
    mode: "bet",
    autoCashoutValue: 1.5,
  });

  const crashPointRef = useRef(2.2);
  const startTimeRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Generate weighted provably fair crash multiplier
  const generateCrash = () => {
    const r = Math.random();
    if (r < 0.05) return 1.0;
    if (r < 0.55) return parseFloat((1.01 + Math.random() * 1.6).toFixed(2));
    if (r < 0.85) return parseFloat((2.0 + Math.random() * 4.5).toFixed(2));
    if (r < 0.95) return parseFloat((6.0 + Math.random() * 10.0).toFixed(2));
    return parseFloat((16.0 + Math.random() * 50.0).toFixed(2));
  };

  const startFlight = () => {
    crashPointRef.current = generateCrash();
    setMultiplier(1.0);
    setGameState("FLYING");
    startTimeRef.current = performance.now();

    // Reset player cashouts for this round
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        cashedAt: undefined,
        profit: undefined,
      }))
    );

    // Deduct active player bets
    if (panel1.active) {
      modifyBalance(-panel1.amount);
      setPanel1((p) => ({ ...p, cashedOut: false, cashedMultiplier: 0 }));
    }
    if (panel2.active) {
      modifyBalance(-panel2.amount);
      setPanel2((p) => ({ ...p, cashedOut: false, cashedMultiplier: 0 }));
    }
  };

  useEffect(() => {
    if (gameState === "WAITING") {
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            startFlight();
            return 4;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }

    if (gameState === "FLYING") {
      let lastPitch = 0;

      const loop = (time: number) => {
        const elapsed = (time - startTimeRef.current) / 1000;
        const curM = parseFloat((1 + Math.pow(elapsed, 1.42) * 0.44).toFixed(2));
        setMultiplier(curM);

        if (time - lastPitch > 120) {
          sfx.playEnginePitch(curM);
          lastPitch = time;
        }

        // Live players random cashout simulation
        setPlayers((prev) =>
          prev.map((p, i) => {
            if (!p.cashedAt && curM >= 1.1 + (i * 0.18)) {
              return {
                ...p,
                cashedAt: curM,
                profit: parseFloat((p.bet * curM).toFixed(2)),
              };
            }
            return p;
          })
        );

        // Auto cashout checks
        setPanel1((p) => {
          if (p.active && !p.cashedOut && p.mode === "auto" && curM >= p.autoCashoutValue) {
            modifyBalance(p.amount * curM);
            sfx.playWin();
            return { ...p, cashedOut: true, cashedMultiplier: curM };
          }
          return p;
        });

        setPanel2((p) => {
          if (p.active && !p.cashedOut && p.mode === "auto" && curM >= p.autoCashoutValue) {
            modifyBalance(p.amount * curM);
            sfx.playWin();
            return { ...p, cashedOut: true, cashedMultiplier: curM };
          }
          return p;
        });

        // Crash check
        if (curM >= crashPointRef.current) {
          setGameState("CRASHED");
          sfx.playCrash();
          setHistory((h) => [crashPointRef.current, ...h.slice(0, 13)]);
          setTimeout(() => {
            setGameState("WAITING");
            setPanel1((p) => ({ ...p, cashedOut: false }));
            setPanel2((p) => ({ ...p, cashedOut: false }));
          }, 2600);
          return;
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    }
  }, [gameState]);

  // Cashout manual
  const cashout = (panelNum: 1 | 2) => {
    if (gameState !== "FLYING") return;
    if (panelNum === 1 && panel1.active && !panel1.cashedOut) {
      const win = panel1.amount * multiplier;
      modifyBalance(win);
      sfx.playWin();
      setPanel1((p) => ({ ...p, cashedOut: true, cashedMultiplier: multiplier }));
    }
    if (panelNum === 2 && panel2.active && !panel2.cashedOut) {
      const win = panel2.amount * multiplier;
      modifyBalance(win);
      sfx.playWin();
      setPanel2((p) => ({ ...p, cashedOut: true, cashedMultiplier: multiplier }));
    }
  };

  // Draw Spribe Aviator Canvas (matching Screenshot 1)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = (canvas.width = canvas.parentElement?.clientWidth || 700);
      const h = (canvas.height = 370);

      // 1. Dark Sunburst background
      ctx.fillStyle = "#0e0f12";
      ctx.fillRect(0, 0, w, h);

      // Subtle red radial burst from bottom left
      const bgGrad = ctx.createRadialGradient(40, h - 30, 10, 40, h - 30, w * 0.9);
      bgGrad.addColorStop(0, "rgba(225, 29, 72, 0.12)");
      bgGrad.addColorStop(1, "rgba(14, 15, 18, 0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle sunburst rays
      ctx.save();
      ctx.translate(40, h - 30);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 1.5;
      for (let angle = 0; angle <= Math.PI / 2; angle += Math.PI / 32) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * w * 1.2, -Math.sin(angle) * h * 1.2);
        ctx.stroke();
      }
      ctx.restore();

      // Bottom baseline and axis dots
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, h - 30);
      ctx.lineTo(w - 20, h - 30);
      ctx.stroke();

      for (let x = 60; x < w - 20; x += 50) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.arc(x, h - 30, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (gameState === "WAITING") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "bold 15px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("WAITING FOR NEXT ROUND", w / 2, h / 2 - 25);

        ctx.fillStyle = "#e11d48";
        ctx.font = "black 52px sans-serif";
        ctx.fillText(`${countdown}s`, w / 2, h / 2 + 30);

        // Progress bar for countdown
        const barW = 200;
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(w / 2 - barW / 2, h / 2 + 55, barW, 6);
        ctx.fillStyle = "#e11d48";
        ctx.fillRect(w / 2 - barW / 2, h / 2 + 55, barW * (countdown / 4), 6);
      } else {
        const startX = 30;
        const startY = h - 30;
        const progress = Math.min(1, Math.log10(multiplier) / 1.55);
        const endX = startX + progress * (w - 140);
        const endY = startY - progress * (h - 90);

        // Filled red polygon under curve
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.45, startY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fillStyle = "rgba(225, 29, 72, 0.4)";
        ctx.fill();

        // Curved stroke line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.45, startY, endX, endY);
        ctx.strokeStyle = "#e11d48";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw Spribe Red Aeroplane (Iconic red propeller plane)
        ctx.save();
        ctx.translate(endX, endY);
        ctx.rotate(-0.28);

        if (gameState === "CRASHED") {
          // Explosion particle
          ctx.fillStyle = "#e11d48";
          ctx.font = "bold 24px sans-serif";
          ctx.fillText("💥", -10, 5);
        } else {
          // Red Plane Body
          ctx.fillStyle = "#e11d48";
          ctx.beginPath();
          ctx.moveTo(22, 0);
          ctx.lineTo(-20, -7);
          ctx.lineTo(-24, -3);
          ctx.lineTo(-24, 3);
          ctx.lineTo(-20, 7);
          ctx.closePath();
          ctx.fill();

          // Cockpit canopy window
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(4, -2, 7, 3, -0.1, 0, Math.PI * 2);
          ctx.fill();

          // Wings
          ctx.fillStyle = "#be123c";
          ctx.beginPath();
          ctx.moveTo(-6, -18);
          ctx.lineTo(8, -1);
          ctx.lineTo(4, 2);
          ctx.lineTo(-10, -18);
          ctx.closePath();
          ctx.fill();

          // Tail fin
          ctx.fillStyle = "#9f1239";
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.lineTo(-26, -14);
          ctx.lineTo(-21, -14);
          ctx.lineTo(-14, 0);
          ctx.closePath();
          ctx.fill();

          // Spinning Propeller
          ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(24, -10);
          ctx.lineTo(24, 10);
          ctx.stroke();
        }
        ctx.restore();

        // Big Multiplier in Center
        ctx.textAlign = "center";
        ctx.fillStyle = gameState === "CRASHED" ? "#e11d48" : "#ffffff";
        ctx.font = "900 68px sans-serif";
        ctx.fillText(
          gameState === "CRASHED" ? "FLEW AWAY" : `${multiplier.toFixed(2)}x`,
          w / 2,
          h / 2
        );

        if (gameState === "CRASHED") {
          ctx.font = "bold 22px sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.fillText(`@ ${crashPointRef.current.toFixed(2)}x`, w / 2, h / 2 + 42);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [gameState, multiplier, countdown]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[#0c0d10] text-white p-3 md:p-4 shadow-2xl border border-stone-800">
      {/* Top Header: Brand & Live History Pills */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 border-b border-stone-800">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-rose-500 font-black italic text-xl tracking-tighter">Aviator</span>
          <span className="rounded bg-rose-500/20 text-rose-400 px-2 py-0.5 text-[10px] font-extrabold uppercase">
            Spribe
          </span>
        </div>

        {/* History Multiplier Badges (Screenshot 1: blue, purple, magenta) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pr-2 text-xs font-black">
          {history.map((m, i) => {
            const isHigh = m >= 10.0;
            const isMid = m >= 2.0;
            const bg = isHigh ? "bg-[#c2185b]" : isMid ? "bg-[#7b1fa2]" : "bg-[#1976d2]";
            return (
              <span key={i} className={`rounded-full px-2.5 py-0.5 text-white ${bg} shadow-sm shrink-0`}>
                {m.toFixed(2)}x
              </span>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Sidebar (Live Bets) + Center Stage (Flight & Dual Consoles) */}
      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        {/* Left Sidebar: Live Bets Lobby (Screenshot 1) */}
        <div className="flex flex-col rounded-xl bg-[#14151a] border border-stone-800/80 p-2.5 overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#0e0f12] p-1 text-center text-xs font-bold text-stone-400">
            <button
              onClick={() => setActiveSidebarTab("all")}
              className={`rounded py-1 transition ${activeSidebarTab === "all" ? "bg-[#252830] text-white" : "hover:text-white"}`}
            >
              All bets
            </button>
            <button
              onClick={() => setActiveSidebarTab("my")}
              className={`rounded py-1 transition ${activeSidebarTab === "my" ? "bg-[#252830] text-white" : "hover:text-white"}`}
            >
              My bets
            </button>
            <button
              onClick={() => setActiveSidebarTab("top")}
              className={`rounded py-1 transition ${activeSidebarTab === "top" ? "bg-[#252830] text-white" : "hover:text-white"}`}
            >
              Top
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] font-black text-stone-400 px-1 pt-2 pb-1 border-b border-stone-800">
            <span>ALL BETS: 1,391</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Live
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1fr_60px_55px_65px] text-[10px] uppercase font-bold text-stone-500 py-1 px-1">
            <span>User</span>
            <span>Bet</span>
            <span>Mult</span>
            <span className="text-right">Cashout</span>
          </div>

          {/* Table Rows */}
          <div className="flex-1 max-h-[460px] overflow-y-auto space-y-1 pr-1 text-xs font-medium">
            {players.map((p, idx) => {
              const isWon = p.cashedAt !== undefined;
              return (
                <div
                  key={idx}
                  className={`grid grid-cols-[1fr_60px_55px_65px] items-center rounded-lg px-2 py-1.5 transition ${
                    isWon ? "bg-emerald-950/30 border border-emerald-500/30" : "bg-[#191a20]"
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5 text-stone-300 font-mono text-[11px]">
                    <span>{p.avatar}</span> {p.username}
                  </span>
                  <span className="text-stone-300 text-[11px] font-bold">{p.bet.toFixed(0)}</span>
                  <span>
                    {isWon ? (
                      <span className="rounded bg-[#1976d2] px-1.5 py-0.5 text-[10px] font-black text-white">
                        {p.cashedAt?.toFixed(2)}x
                      </span>
                    ) : (
                      <span className="text-stone-600">-</span>
                    )}
                  </span>
                  <span className={`text-right font-black text-[11px] ${isWon ? "text-emerald-400" : "text-stone-600"}`}>
                    {isWon ? `+${p.profit?.toFixed(0)}` : "-"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Aviator Flight Canvas + Dual Bet Panels */}
        <div className="flex flex-col gap-3">
          {/* Canvas Box */}
          <div className="relative overflow-hidden rounded-xl border border-stone-800 bg-[#0e0f12]">
            <canvas ref={canvasRef} className="block w-full h-[370px]" />
          </div>

          {/* Dual Bet Consoles (Screenshot 1: identical side-by-side) */}
          <div className="grid gap-3 md:grid-cols-2">
            {/* Console 1 */}
            <div className="flex flex-col gap-2 rounded-xl bg-[#14151a] border border-stone-800 p-3">
              {/* Bet / Auto toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center rounded-lg bg-[#0e0f12] p-0.5 text-xs font-bold text-stone-400">
                  <button
                    onClick={() => setPanel1((p) => ({ ...p, mode: "bet" }))}
                    className={`rounded px-3 py-1 transition ${panel1.mode === "bet" ? "bg-[#252830] text-white" : ""}`}
                  >
                    Bet
                  </button>
                  <button
                    onClick={() => setPanel1((p) => ({ ...p, mode: "auto" }))}
                    className={`rounded px-3 py-1 transition ${panel1.mode === "auto" ? "bg-[#252830] text-white" : ""}`}
                  >
                    Auto
                  </button>
                </div>

                {panel1.mode === "auto" && (
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="text-stone-400 text-[10px]">Auto Cash:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="1.1"
                      value={panel1.autoCashoutValue}
                      onChange={(e) => setPanel1((p) => ({ ...p, autoCashoutValue: parseFloat(e.target.value) || 2.0 }))}
                      className="w-16 rounded bg-stone-900 border border-stone-700 px-1 py-0.5 text-center text-xs text-white"
                    />
                    <span>x</span>
                  </div>
                )}
              </div>

              {/* Amount stepper & Large Action button */}
              <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between rounded-lg bg-[#0e0f12] border border-stone-700 px-2 py-1.5">
                    <button
                      onClick={() => setPanel1((p) => ({ ...p, amount: Math.max(10, p.amount - 50) }))}
                      className="h-6 w-6 rounded bg-stone-800 text-stone-300 font-black text-sm hover:bg-stone-700"
                    >
                      −
                    </button>
                    <span className="font-black text-sm text-white">{panel1.amount.toFixed(0)}</span>
                    <button
                      onClick={() => setPanel1((p) => ({ ...p, amount: p.amount + 50 }))}
                      className="h-6 w-6 rounded bg-stone-800 text-stone-300 font-black text-sm hover:bg-stone-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setPanel1((p) => ({ ...p, amount: amt }))}
                        className="rounded bg-[#20222a] py-1 text-stone-300 hover:bg-[#282b35]"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Green BET / Orange CASHOUT Button */}
                {panel1.active && gameState === "FLYING" && !panel1.cashedOut ? (
                  <button
                    onClick={() => cashout(1)}
                    className="h-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-2 text-center text-slate-950 font-black shadow-lg shadow-orange-500/20 active:scale-98 animate-pulse"
                  >
                    <span className="block text-xs uppercase tracking-wider">Cashout</span>
                    <span className="text-xl font-black">{(panel1.amount * multiplier).toFixed(0)} KES</span>
                  </button>
                ) : panel1.active && panel1.cashedOut ? (
                  <div className="h-full rounded-xl bg-emerald-950/60 border border-emerald-500 flex flex-col items-center justify-center p-2 text-center text-emerald-400">
                    <span className="text-xs font-bold uppercase">Cashed out</span>
                    <span className="text-base font-black">{(panel1.amount * panel1.cashedMultiplier).toFixed(0)} KES</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setPanel1((p) => ({ ...p, active: !p.active }))}
                    disabled={panel1.amount > balance}
                    className={`h-full rounded-xl p-2 text-center font-black transition active:scale-98 ${
                      panel1.active
                        ? "bg-rose-600 text-white hover:bg-rose-500"
                        : "bg-[#28a745] text-white hover:bg-[#218838] shadow-lg shadow-green-600/20"
                    } disabled:opacity-50`}
                  >
                    <span className="block text-xs uppercase tracking-wider">{panel1.active ? "Cancel" : "Bet"}</span>
                    <span className="text-lg font-black">{panel1.amount.toFixed(0)} KES</span>
                  </button>
                )}
              </div>
            </div>

            {/* Console 2 */}
            <div className="flex flex-col gap-2 rounded-xl bg-[#14151a] border border-stone-800 p-3">
              {/* Bet / Auto toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center rounded-lg bg-[#0e0f12] p-0.5 text-xs font-bold text-stone-400">
                  <button
                    onClick={() => setPanel2((p) => ({ ...p, mode: "bet" }))}
                    className={`rounded px-3 py-1 transition ${panel2.mode === "bet" ? "bg-[#252830] text-white" : ""}`}
                  >
                    Bet
                  </button>
                  <button
                    onClick={() => setPanel2((p) => ({ ...p, mode: "auto" }))}
                    className={`rounded px-3 py-1 transition ${panel2.mode === "auto" ? "bg-[#252830] text-white" : ""}`}
                  >
                    Auto
                  </button>
                </div>

                {panel2.mode === "auto" && (
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="text-stone-400 text-[10px]">Auto Cash:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="1.1"
                      value={panel2.autoCashoutValue}
                      onChange={(e) => setPanel2((p) => ({ ...p, autoCashoutValue: parseFloat(e.target.value) || 1.5 }))}
                      className="w-16 rounded bg-stone-900 border border-stone-700 px-1 py-0.5 text-center text-xs text-white"
                    />
                    <span>x</span>
                  </div>
                )}
              </div>

              {/* Amount stepper & Large Action button */}
              <div className="grid grid-cols-[140px_1fr] gap-2 items-center">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between rounded-lg bg-[#0e0f12] border border-stone-700 px-2 py-1.5">
                    <button
                      onClick={() => setPanel2((p) => ({ ...p, amount: Math.max(10, p.amount - 50) }))}
                      className="h-6 w-6 rounded bg-stone-800 text-stone-300 font-black text-sm hover:bg-stone-700"
                    >
                      −
                    </button>
                    <span className="font-black text-sm text-white">{panel2.amount.toFixed(0)}</span>
                    <button
                      onClick={() => setPanel2((p) => ({ ...p, amount: p.amount + 50 }))}
                      className="h-6 w-6 rounded bg-stone-800 text-stone-300 font-black text-sm hover:bg-stone-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setPanel2((p) => ({ ...p, amount: amt }))}
                        className="rounded bg-[#20222a] py-1 text-stone-300 hover:bg-[#282b35]"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Green BET / Orange CASHOUT Button */}
                {panel2.active && gameState === "FLYING" && !panel2.cashedOut ? (
                  <button
                    onClick={() => cashout(2)}
                    className="h-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-2 text-center text-slate-950 font-black shadow-lg shadow-orange-500/20 active:scale-98 animate-pulse"
                  >
                    <span className="block text-xs uppercase tracking-wider">Cashout</span>
                    <span className="text-xl font-black">{(panel2.amount * multiplier).toFixed(0)} KES</span>
                  </button>
                ) : panel2.active && panel2.cashedOut ? (
                  <div className="h-full rounded-xl bg-emerald-950/60 border border-emerald-500 flex flex-col items-center justify-center p-2 text-center text-emerald-400">
                    <span className="text-xs font-bold uppercase">Cashed out</span>
                    <span className="text-base font-black">{(panel2.amount * panel2.cashedMultiplier).toFixed(0)} KES</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setPanel2((p) => ({ ...p, active: !p.active }))}
                    disabled={panel2.amount > balance}
                    className={`h-full rounded-xl p-2 text-center font-black transition active:scale-98 ${
                      panel2.active
                        ? "bg-rose-600 text-white hover:bg-rose-500"
                        : "bg-[#28a745] text-white hover:bg-[#218838] shadow-lg shadow-green-600/20"
                    } disabled:opacity-50`}
                  >
                    <span className="block text-xs uppercase tracking-wider">{panel2.active ? "Cancel" : "Bet"}</span>
                    <span className="text-lg font-black">{panel2.amount.toFixed(0)} KES</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
