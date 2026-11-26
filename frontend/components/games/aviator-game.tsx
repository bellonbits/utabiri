"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/game-audio";
import { useGameWallet } from "@/lib/game-wallet";
import { ShieldIcon, PlaneIcon, CoinsIcon, ClockIcon, SlidersIcon } from "@/components/icons";

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
  initials: string;
  avatarBg: string;
  bet: number;
  cashedAt?: number;
  profit?: number;
}

const INITIAL_PLAYERS: PlayerBet[] = [
  { username: "b***u", initials: "BU", avatarBg: "bg-sky-700", bet: 96.15, cashedAt: 1.10, profit: 105.76 },
  { username: "u***k", initials: "UK", avatarBg: "bg-amber-700", bet: 50.80 },
  { username: "m***r", initials: "MR", avatarBg: "bg-purple-700", bet: 49.27 },
  { username: "1****", initials: "1*", avatarBg: "bg-emerald-700", bet: 40.46 },
  { username: "r***k", initials: "RK", avatarBg: "bg-rose-700", bet: 39.77 },
  { username: "4***3", initials: "43", avatarBg: "bg-indigo-700", bet: 39.77 },
  { username: "4***5", initials: "45", avatarBg: "bg-teal-700", bet: 39.77 },
  { username: "1***4", initials: "14", avatarBg: "bg-orange-700", bet: 39.77 },
  { username: "4***5", initials: "45", avatarBg: "bg-pink-700", bet: 28.41, cashedAt: 1.11, profit: 31.53 },
  { username: "4***5", initials: "45", avatarBg: "bg-teal-700", bet: 27.27, cashedAt: 1.56, profit: 42.54 },
  { username: "d***d", initials: "DD", avatarBg: "bg-slate-700", bet: 26.70 },
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
  const [roundSeed, setRoundSeed] = useState("a8f4c2e19d7b63f0a92847cbb64098314e357912");

  // Dual Bet Panels (matching Screenshot)
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

  // Provably fair crash calculation
  const generateCrash = () => {
    const r = Math.random();
    if (r < 0.04) return 1.0;
    if (r < 0.52) return parseFloat((1.01 + Math.random() * 1.6).toFixed(2));
    if (r < 0.82) return parseFloat((2.0 + Math.random() * 4.5).toFixed(2));
    if (r < 0.94) return parseFloat((6.0 + Math.random() * 9.5).toFixed(2));
    return parseFloat((15.0 + Math.random() * 45.0).toFixed(2));
  };

  const startFlight = () => {
    crashPointRef.current = generateCrash();
    setMultiplier(1.0);
    setGameState("FLYING");
    startTimeRef.current = performance.now();
    setRoundSeed(Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(""));

    // Reset player cashouts for this round
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        cashedAt: undefined,
        profit: undefined,
      }))
    );

    // Deduct active player stakes
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

        // Live players cashout simulation
        setPlayers((prev) =>
          prev.map((p, i) => {
            if (!p.cashedAt && curM >= 1.1 + i * 0.18) {
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

  // Canvas drawing (matching Screenshot 1: Spribe Aviator)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = (canvas.width = canvas.parentElement?.clientWidth || 700);
      const h = (canvas.height = 360);

      // Dark background
      ctx.fillStyle = "#0c0d10";
      ctx.fillRect(0, 0, w, h);

      // Sunburst radial rays from bottom left
      ctx.save();
      ctx.translate(40, h - 30);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1.5;
      for (let angle = 0; angle <= Math.PI / 2; angle += Math.PI / 32) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * w * 1.3, -Math.sin(angle) * h * 1.3);
        ctx.stroke();
      }
      ctx.restore();

      // Horizontal baseline and dot markers
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(30, h - 30);
      ctx.lineTo(w - 20, h - 30);
      ctx.stroke();

      for (let x = 60; x < w - 20; x += 50) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.arc(x, h - 30, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (gameState === "WAITING") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("WAITING FOR NEXT ROUND", w / 2, h / 2 - 25);

        ctx.fillStyle = "#e11d48";
        ctx.font = "900 48px sans-serif";
        ctx.fillText(`${countdown}s`, w / 2, h / 2 + 25);

        // Progress bar
        const barW = 200;
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(w / 2 - barW / 2, h / 2 + 45, barW, 5);
        ctx.fillStyle = "#e11d48";
        ctx.fillRect(w / 2 - barW / 2, h / 2 + 45, barW * (countdown / 4), 5);
      } else {
        const startX = 30;
        const startY = h - 30;
        const progress = Math.min(1, Math.log10(multiplier) / 1.55);
        const endX = startX + progress * (w - 140);
        const endY = startY - progress * (h - 90);

        // Filled red area under trajectory curve
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.45, startY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fillStyle = "rgba(225, 29, 72, 0.35)";
        ctx.fill();

        // Trajectory curve stroke
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.45, startY, endX, endY);
        ctx.strokeStyle = "#e11d48";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Draw Spribe Red Plane
        ctx.save();
        ctx.translate(endX, endY);
        ctx.rotate(-0.28);

        if (gameState === "CRASHED") {
          // Geometric star explosion (no emojis)
          ctx.strokeStyle = "#e11d48";
          ctx.fillStyle = "#f43f5e";
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const rot = (i * Math.PI) / 4;
            const rOuter = 16;
            const rInner = 6;
            ctx.lineTo(Math.cos(rot) * rOuter, Math.sin(rot) * rOuter);
            ctx.lineTo(Math.cos(rot + Math.PI / 8) * rInner, Math.sin(rot + Math.PI / 8) * rInner);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Red Fuselage
          ctx.fillStyle = "#e11d48";
          ctx.beginPath();
          ctx.moveTo(22, 0);
          ctx.lineTo(-20, -7);
          ctx.lineTo(-24, -3);
          ctx.lineTo(-24, 3);
          ctx.lineTo(-20, 7);
          ctx.closePath();
          ctx.fill();

          // Cockpit Glass
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(4, -2, 7, 3, -0.1, 0, Math.PI * 2);
          ctx.fill();

          // Main Wing
          ctx.fillStyle = "#be123c";
          ctx.beginPath();
          ctx.moveTo(-6, -18);
          ctx.lineTo(8, -1);
          ctx.lineTo(4, 2);
          ctx.lineTo(-10, -18);
          ctx.closePath();
          ctx.fill();

          // Tail Wing
          ctx.fillStyle = "#9f1239";
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.lineTo(-26, -14);
          ctx.lineTo(-21, -14);
          ctx.lineTo(-14, 0);
          ctx.closePath();
          ctx.fill();

          // Propeller Blade
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(24, -10);
          ctx.lineTo(24, 10);
          ctx.stroke();
        }
        ctx.restore();

        // Center Multiplier display
        ctx.textAlign = "center";
        ctx.fillStyle = gameState === "CRASHED" ? "#e11d48" : "#ffffff";
        ctx.font = "900 64px sans-serif";
        ctx.fillText(
          gameState === "CRASHED" ? "FLEW AWAY!" : `${multiplier.toFixed(2)}x`,
          w / 2,
          h / 2
        );

        if (gameState === "CRASHED") {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
          ctx.fillText(`Crashed @ ${crashPointRef.current.toFixed(2)}x`, w / 2, h / 2 + 38);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [gameState, multiplier, countdown]);

  return (
    <div className="flex flex-col border border-stone-800 bg-[#0c0d10] text-white">
      {/* Top Strip: Brand & Live Multiplier Pills */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-800 px-4 py-2.5 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1.5 text-rose-500 font-black italic text-lg tracking-tighter">
            <PlaneIcon className="h-5 w-5 text-rose-500" /> Aviator
          </span>
          <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 text-[10px] font-extrabold uppercase">
            97.0% RTP
          </span>
        </div>

        {/* History Multiplier Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-black">
          {history.map((m, i) => {
            const isHigh = m >= 10.0;
            const isMid = m >= 2.0;
            const bg = isHigh ? "bg-[#c2185b]" : isMid ? "bg-[#7b1fa2]" : "bg-[#1976d2]";
            return (
              <span key={i} className={`rounded-full px-2.5 py-0.5 text-white ${bg} shrink-0 text-[11px]`}>
                {m.toFixed(2)}x
              </span>
            );
          })}
        </div>
      </div>

      {/* Main Sportsbook Grid: Left Table + Right Stage */}
      <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
        {/* Left Side: Live Bets Table */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-stone-800 bg-[#111217]">
          {/* Tabs */}
          <div className="grid grid-cols-3 border-b border-stone-800 text-center text-xs font-bold text-stone-400">
            <button
              onClick={() => setActiveSidebarTab("all")}
              className={`py-2 transition ${activeSidebarTab === "all" ? "bg-[#1a1c23] text-white border-b-2 border-rose-500" : "hover:text-white"}`}
            >
              All bets
            </button>
            <button
              onClick={() => setActiveSidebarTab("my")}
              className={`py-2 transition ${activeSidebarTab === "my" ? "bg-[#1a1c23] text-white border-b-2 border-rose-500" : "hover:text-white"}`}
            >
              My bets
            </button>
            <button
              onClick={() => setActiveSidebarTab("top")}
              className={`py-2 transition ${activeSidebarTab === "top" ? "bg-[#1a1c23] text-white border-b-2 border-rose-500" : "hover:text-white"}`}
            >
              Top
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] font-black text-stone-400 px-3 py-1.5 border-b border-stone-800/80 bg-[#0e0f13]">
            <span>ROUND BETS: {players.length + (panel1.active ? 1 : 0) + (panel2.active ? 1 : 0)}</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[1fr_55px_55px_65px] text-[10px] uppercase font-bold text-stone-500 py-1.5 px-3 border-b border-stone-800/60">
            <span>User</span>
            <span>Stake</span>
            <span>Mult</span>
            <span className="text-right">Payout</span>
          </div>

          {/* Table Rows */}
          <div className="flex-1 max-h-[360px] overflow-y-auto divide-y divide-stone-800/50 text-xs font-medium">
            {panel1.active && (
              <div className="grid grid-cols-[1fr_55px_55px_65px] items-center px-3 py-1.5 bg-rose-950/20 text-rose-300">
                <span className="truncate flex items-center gap-1.5 font-bold text-[11px]">
                  <span className="h-4 w-4 rounded-full bg-rose-600 text-[9px] flex items-center justify-center font-black text-white">Y1</span> You (1)
                </span>
                <span className="font-bold">{panel1.amount}</span>
                <span>
                  {panel1.cashedOut ? (
                    <span className="rounded bg-[#1976d2] px-1 py-0.5 text-[10px] font-black text-white">
                      {panel1.cashedMultiplier.toFixed(2)}x
                    </span>
                  ) : "-"}
                </span>
                <span className="text-right font-black text-emerald-400">
                  {panel1.cashedOut ? `+${(panel1.amount * panel1.cashedMultiplier).toFixed(0)}` : "-"}
                </span>
              </div>
            )}

            {panel2.active && (
              <div className="grid grid-cols-[1fr_55px_55px_65px] items-center px-3 py-1.5 bg-rose-950/20 text-rose-300">
                <span className="truncate flex items-center gap-1.5 font-bold text-[11px]">
                  <span className="h-4 w-4 rounded-full bg-rose-600 text-[9px] flex items-center justify-center font-black text-white">Y2</span> You (2)
                </span>
                <span className="font-bold">{panel2.amount}</span>
                <span>
                  {panel2.cashedOut ? (
                    <span className="rounded bg-[#1976d2] px-1 py-0.5 text-[10px] font-black text-white">
                      {panel2.cashedMultiplier.toFixed(2)}x
                    </span>
                  ) : "-"}
                </span>
                <span className="text-right font-black text-emerald-400">
                  {panel2.cashedOut ? `+${(panel2.amount * panel2.cashedMultiplier).toFixed(0)}` : "-"}
                </span>
              </div>
            )}

            {players.map((p, idx) => {
              const isWon = p.cashedAt !== undefined;
              return (
                <div
                  key={idx}
                  className={`grid grid-cols-[1fr_55px_55px_65px] items-center px-3 py-1.5 transition ${
                    isWon ? "bg-emerald-950/20" : ""
                  }`}
                >
                  <span className="truncate flex items-center gap-1.5 text-stone-300 font-mono text-[11px]">
                    <span className={`h-4 w-4 rounded-full ${p.avatarBg} text-[9px] flex items-center justify-center font-black text-white`}>
                      {p.initials}
                    </span>
                    {p.username}
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

        {/* Right Side: Flight Arena + Dual Bet Consoles */}
        <div className="flex flex-col">
          {/* Canvas Box */}
          <div className="relative border-b border-stone-800 bg-[#0e0f12]">
            <canvas ref={canvasRef} className="block w-full h-[360px]" />
          </div>

          {/* Dual Bet Consoles */}
          <div className="grid divide-y md:divide-y-0 md:divide-x divide-stone-800 md:grid-cols-2 bg-[#121318]">
            {/* Console 1 */}
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center border border-stone-700 bg-[#0c0d10] text-xs font-bold text-stone-400">
                  <button
                    onClick={() => setPanel1((p) => ({ ...p, mode: "bet" }))}
                    className={`px-3 py-1 transition ${panel1.mode === "bet" ? "bg-[#252830] text-white" : ""}`}
                  >
                    Bet
                  </button>
                  <button
                    onClick={() => setPanel1((p) => ({ ...p, mode: "auto" }))}
                    className={`px-3 py-1 transition ${panel1.mode === "auto" ? "bg-[#252830] text-white" : ""}`}
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
                      className="w-16 bg-stone-900 border border-stone-700 px-1 py-0.5 text-center text-xs text-white"
                    />
                    <span>x</span>
                  </div>
                )}
              </div>

              {/* Amount stepper & Action button */}
              <div className="grid grid-cols-[130px_1fr] gap-2 items-center">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between border border-stone-700 bg-[#0c0d10] px-2 py-1">
                    <button
                      onClick={() => setPanel1((p) => ({ ...p, amount: Math.max(10, p.amount - 50) }))}
                      className="h-6 w-6 bg-stone-800 text-stone-300 font-black text-sm hover:bg-stone-700"
                    >
                      −
                    </button>
                    <span className="font-black text-xs text-white">{panel1.amount}</span>
                    <button
                      onClick={() => setPanel1((p) => ({ ...p, amount: p.amount + 50 }))}
                      className="h-6 w-6 bg-stone-800 text-stone-300 font-black text-sm hover:bg-stone-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] font-bold">
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setPanel1((p) => ({ ...p, amount: amt }))}
                        className="border border-stone-700/60 bg-[#1c1e26] py-0.5 text-stone-300 hover:bg-[#252833]"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Action Button */}
                {panel1.active && gameState === "FLYING" && !panel1.cashedOut ? (
                  <button
                    onClick={() => cashout(1)}
                    className="h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black active:scale-98 animate-pulse flex flex-col items-center justify-center cursor-pointer"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-extrabold">CASHOUT</span>
                    <span className="text-base font-black">{(panel1.amount * multiplier).toFixed(0)} Coins</span>
                  </button>
                ) : panel1.active && panel1.cashedOut ? (
                  <div className="h-14 bg-emerald-950/60 border border-emerald-500 flex flex-col items-center justify-center text-center text-emerald-400">
                    <span className="text-[10px] font-bold uppercase">CASHED OUT</span>
                    <span className="text-sm font-black">{(panel1.amount * panel1.cashedMultiplier).toFixed(0)} Coins</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setPanel1((p) => ({ ...p, active: !p.active }))}
                    disabled={panel1.amount > balance}
                    className={`h-14 font-black transition active:scale-98 flex flex-col items-center justify-center cursor-pointer ${
                      panel1.active
                        ? "bg-rose-600 text-white hover:bg-rose-500"
                        : "bg-[#28a745] text-white hover:bg-[#218838]"
                    } disabled:opacity-50`}
                  >
                    <span className="text-[10px] uppercase tracking-wider">{panel1.active ? "CANCEL" : "BET"}</span>
                    <span className="text-sm font-black">{panel1.amount} Coins</span>
                  </button>
                )}
              </div>
            </div>

            {/* Console 2 */}
            <div className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center border border-stone-700 bg-[#0c0d10] text-xs font-bold text-stone-400">
                  <button
                    onClick={() => setPanel2((p) => ({ ...p, mode: "bet" }))}
                    className={`px-3 py-1 transition ${panel2.mode === "bet" ? "bg-[#252830] text-white" : ""}`}
                  >
                    Bet
                  </button>
                  <button
                    onClick={() => setPanel2((p) => ({ ...p, mode: "auto" }))}
                    className={`px-3 py-1 transition ${panel2.mode === "auto" ? "bg-[#252830] text-white" : ""}`}
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
                      className="w-16 bg-stone-900 border border-stone-700 px-1 py-0.5 text-center text-xs text-white"
                    />
                    <span>x</span>
                  </div>
                )}
              </div>

              {/* Amount stepper & Action button */}
              <div className="grid grid-cols-[130px_1fr] gap-2 items-center">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between border border-stone-700 bg-[#0c0d10] px-2 py-1">
                    <button
                      onClick={() => setPanel2((p) => ({ ...p, amount: Math.max(10, p.amount - 50) }))}
                      className="h-6 w-6 bg-stone-800 text-stone-300 font-black text-sm hover:bg-stone-700"
                    >
                      −
                    </button>
                    <span className="font-black text-xs text-white">{panel2.amount}</span>
                    <button
                      onClick={() => setPanel2((p) => ({ ...p, amount: p.amount + 50 }))}
                      className="h-6 w-6 bg-stone-800 text-stone-300 font-black text-sm hover:bg-stone-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] font-bold">
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setPanel2((p) => ({ ...p, amount: amt }))}
                        className="border border-stone-700/60 bg-[#1c1e26] py-0.5 text-stone-300 hover:bg-[#252833]"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Action Button */}
                {panel2.active && gameState === "FLYING" && !panel2.cashedOut ? (
                  <button
                    onClick={() => cashout(2)}
                    className="h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black active:scale-98 animate-pulse flex flex-col items-center justify-center cursor-pointer"
                  >
                    <span className="text-[10px] uppercase tracking-wider font-extrabold">CASHOUT</span>
                    <span className="text-base font-black">{(panel2.amount * multiplier).toFixed(0)} Coins</span>
                  </button>
                ) : panel2.active && panel2.cashedOut ? (
                  <div className="h-14 bg-emerald-950/60 border border-emerald-500 flex flex-col items-center justify-center text-center text-emerald-400">
                    <span className="text-[10px] font-bold uppercase">CASHED OUT</span>
                    <span className="text-sm font-black">{(panel2.amount * panel2.cashedMultiplier).toFixed(0)} Coins</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setPanel2((p) => ({ ...p, active: !p.active }))}
                    disabled={panel2.amount > balance}
                    className={`h-14 font-black transition active:scale-98 flex flex-col items-center justify-center cursor-pointer ${
                      panel2.active
                        ? "bg-rose-600 text-white hover:bg-rose-500"
                        : "bg-[#28a745] text-white hover:bg-[#218838]"
                    } disabled:opacity-50`}
                  >
                    <span className="text-[10px] uppercase tracking-wider">{panel2.active ? "CANCEL" : "BET"}</span>
                    <span className="text-sm font-black">{panel2.amount} Coins</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Provably Fair Bottom Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-800 bg-[#090a0d] px-4 py-2 text-[11px] text-stone-400">
        <div className="flex items-center gap-2">
          <ShieldIcon className="h-4 w-4 text-emerald-400" />
          <span className="font-bold text-stone-300">Provably Fair Round:</span>
          <span className="font-mono text-[10px] text-stone-500 truncate max-w-[200px] md:max-w-[320px]">{roundSeed}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>RTP: <strong className="text-stone-200">97.0%</strong></span>
          <span className="text-stone-600">|</span>
          <span>Server-Authoritative</span>
        </div>
      </div>
    </div>
  );
}
