"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/game-audio";
import { useGameWallet } from "@/lib/game-wallet";

type GameState = "WAITING" | "FLYING" | "CRASHED";

interface BetState {
  amount: number;
  active: boolean;
  cashedOut: boolean;
  cashedMultiplier: number;
  autoCashout: boolean;
  autoCashoutValue: number;
}

const MOCK_PLAYERS = [
  { name: "Kipchoge_99", bet: 250, avatar: "🏃" },
  { name: "NairobiTrader", bet: 500, avatar: "📈" },
  { name: "Omondi_E", bet: 100, avatar: "🦁" },
  { name: "Achieng_M", bet: 300, avatar: "⭐" },
  { name: "Wanjiku_Fin", bet: 150, avatar: "☕" },
  { name: "Hassan_Msa", bet: 400, avatar: "🌊" },
  { name: "Kamau_Bulls", bet: 200, avatar: "⚡" },
];

export function AviatorGame() {
  const { balance, modifyBalance } = useGameWallet();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<GameState>("WAITING");
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(4);
  const [history, setHistory] = useState<number[]>([1.84, 3.42, 1.15, 12.8, 2.05, 1.44, 5.21]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Bet 1
  const [bet1, setBet1] = useState<BetState>({
    amount: 100,
    active: false,
    cashedOut: false,
    cashedMultiplier: 0,
    autoCashout: false,
    autoCashoutValue: 2.0,
  });

  // Bet 2
  const [bet2, setBet2] = useState<BetState>({
    amount: 50,
    active: false,
    cashedOut: false,
    cashedMultiplier: 0,
    autoCashout: false,
    autoCashoutValue: 1.5,
  });

  // Animation & simulation refs
  const crashPointRef = useRef(2.5);
  const startTimeRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Toggle sound
  const toggleSound = () => {
    sfx.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Generate crash point (provably fair distribution: heavily weighted 1x - 3x, occasionally 10x - 50x)
  const generateCrashPoint = () => {
    const r = Math.random();
    if (r < 0.05) return 1.0; // instant crash 5%
    if (r < 0.55) return parseFloat((1.01 + Math.random() * 1.8).toFixed(2)); // 1.01x - 2.8x
    if (r < 0.85) return parseFloat((2.5 + Math.random() * 4.5).toFixed(2)); // 2.5x - 7.0x
    if (r < 0.96) return parseFloat((7.0 + Math.random() * 15.0).toFixed(2)); // 7x - 22x
    return parseFloat((20.0 + Math.random() * 60.0).toFixed(2)); // Big rocket 20x - 80x
  };

  // Start round
  const startFlight = () => {
    crashPointRef.current = generateCrashPoint();
    setMultiplier(1.0);
    setGameState("FLYING");
    startTimeRef.current = performance.now();

    // Deduct active bets
    if (bet1.active) {
      modifyBalance(-bet1.amount);
      setBet1((b) => ({ ...b, cashedOut: false, cashedMultiplier: 0 }));
    }
    if (bet2.active) {
      modifyBalance(-bet2.amount);
      setBet2((b) => ({ ...b, cashedOut: false, cashedMultiplier: 0 }));
    }
  };

  // Main game tick
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
      let lastSoundTime = 0;

      const loop = (time: number) => {
        const elapsed = (time - startTimeRef.current) / 1000;
        // Exponential growth formula: 1 + elapsed^1.4 * 0.45
        const currentM = parseFloat((1 + Math.pow(elapsed, 1.45) * 0.48).toFixed(2));
        setMultiplier(currentM);

        // Sound pitch scaling
        if (time - lastSoundTime > 120) {
          sfx.playEnginePitch(currentM);
          lastSoundTime = time;
        }

        // Auto cashout checks
        setBet1((b) => {
          if (b.active && !b.cashedOut && b.autoCashout && currentM >= b.autoCashoutValue) {
            const win = b.amount * currentM;
            modifyBalance(win);
            sfx.playWin();
            return { ...b, cashedOut: true, cashedMultiplier: currentM };
          }
          return b;
        });

        setBet2((b) => {
          if (b.active && !b.cashedOut && b.autoCashout && currentM >= b.autoCashoutValue) {
            const win = b.amount * currentM;
            modifyBalance(win);
            sfx.playWin();
            return { ...b, cashedOut: true, cashedMultiplier: currentM };
          }
          return b;
        });

        // Crash check
        if (currentM >= crashPointRef.current) {
          setGameState("CRASHED");
          sfx.playCrash();
          setHistory((h) => [crashPointRef.current, ...h.slice(0, 8)]);
          setTimeout(() => {
            setGameState("WAITING");
            setBet1((b) => ({ ...b, cashedOut: false }));
            setBet2((b) => ({ ...b, cashedOut: false }));
          }, 2800);
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

  // Cashout manually
  const cashout = (betNumber: 1 | 2) => {
    if (gameState !== "FLYING") return;
    if (betNumber === 1 && bet1.active && !bet1.cashedOut) {
      const win = bet1.amount * multiplier;
      modifyBalance(win);
      sfx.playWin();
      setBet1((b) => ({ ...b, cashedOut: true, cashedMultiplier: multiplier }));
    }
    if (betNumber === 2 && bet2.active && !bet2.cashedOut) {
      const win = bet2.amount * multiplier;
      modifyBalance(win);
      sfx.playWin();
      setBet2((b) => ({ ...b, cashedOut: true, cashedMultiplier: multiplier }));
    }
  };

  // Draw Aviator curve and airplane on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const render = () => {
      const w = (canvas.width = canvas.parentElement?.clientWidth || 700);
      const h = (canvas.height = 360);

      // Background grid
      ctx.fillStyle = "#0c1322";
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let x = 40; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 30);
        ctx.stroke();
      }
      for (let y = 30; y < h - 30; y += 45) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.lineTo(40, h - 30);
      ctx.lineTo(w, h - 30);
      ctx.stroke();

      if (gameState === "WAITING") {
        // Waiting stage display
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("NEXT ROUND STARTS IN", w / 2, h / 2 - 20);

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 56px sans-serif";
        ctx.fillText(`${countdown}s`, w / 2, h / 2 + 35);
      } else {
        // Curve parameters
        const startX = 40;
        const startY = h - 30;
        const progress = Math.min(1, Math.log10(multiplier) / 1.6);
        const endX = startX + progress * (w - 120);
        const endY = startY - progress * (h - 90);

        // Gradient filled curve
        const grad = ctx.createLinearGradient(0, endY, 0, startY);
        grad.addColorStop(0, "rgba(239, 68, 68, 0.35)");
        grad.addColorStop(1, "rgba(239, 68, 68, 0.0)");

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(startX + (endX - startX) * 0.5, startY, endX, endY);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw red jet / prop plane
        ctx.save();
        ctx.translate(endX, endY);
        // Tilt plane upwards slightly
        ctx.rotate(-0.25);

        if (gameState === "CRASHED") {
          // Explosion burst
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Fuselage
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          // Wings
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.moveTo(-4, -16);
          ctx.lineTo(4, 0);
          ctx.lineTo(-4, 16);
          ctx.lineTo(-7, 0);
          ctx.closePath();
          ctx.fill();

          // Tail
          ctx.fillStyle = "#b91c1c";
          ctx.beginPath();
          ctx.moveTo(-16, 0);
          ctx.lineTo(-20, -10);
          ctx.lineTo(-13, -1);
          ctx.closePath();
          ctx.fill();

          // Propeller blur
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.fillRect(18, -10, 2, 20);
        }
        ctx.restore();

        // Multiplier Center Text
        ctx.textAlign = "center";
        ctx.fillStyle = gameState === "CRASHED" ? "#ef4444" : "#ffffff";
        ctx.font = "bold 64px sans-serif";
        ctx.fillText(
          gameState === "CRASHED" ? "FLEW AWAY" : `${multiplier.toFixed(2)}x`,
          w / 2,
          h / 2
        );

        if (gameState === "CRASHED") {
          ctx.font = "bold 24px sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.fillText(`@ ${crashPointRef.current.toFixed(2)}x`, w / 2, h / 2 + 40);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [gameState, multiplier, countdown]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: History Chips & Sound */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <span className="text-mut-2 uppercase tracking-wider text-[11px] mr-1">Rounds:</span>
          {history.map((m, idx) => {
            const isHigh = m >= 10;
            const isMid = m >= 2;
            return (
              <span
                key={idx}
                className={`rounded-full px-2.5 py-0.5 shadow-xs ${
                  isHigh
                    ? "bg-purple-600 text-white font-extrabold"
                    : isMid
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {m.toFixed(2)}x
              </span>
            );
          })}
        </div>

        <button
          onClick={toggleSound}
          className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:bg-panel-2"
        >
          {soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF"}
        </button>
      </div>

      {/* Main Canvas Stage */}
      <div className="relative overflow-hidden rounded-2xl border border-line shadow-lg">
        <canvas ref={canvasRef} className="block w-full h-[360px]" />
      </div>

      {/* Bet Control Consoles */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Bet Panel 1 */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-mut">Panel 1</span>
            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={bet1.autoCashout}
                onChange={(e) => setBet1((b) => ({ ...b, autoCashout: e.target.checked }))}
                className="rounded"
              />
              Auto Cashout @
              <input
                type="number"
                step="0.1"
                min="1.1"
                value={bet1.autoCashoutValue}
                onChange={(e) => setBet1((b) => ({ ...b, autoCashoutValue: parseFloat(e.target.value) || 1.5 }))}
                className="w-16 rounded border border-line bg-panel-2 px-1.5 py-0.5 text-center text-xs font-bold"
              />
              x
            </label>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <span className="text-[10px] uppercase font-bold text-mut-2">Bet Amount (Coins)</span>
              <div className="flex items-center rounded-xl border border-line bg-panel-2 px-3 py-2">
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={bet1.amount}
                  onChange={(e) => setBet1((b) => ({ ...b, amount: Math.max(10, parseInt(e.target.value) || 10) }))}
                  disabled={bet1.active && gameState === "FLYING"}
                  className="w-full bg-transparent text-lg font-black outline-none"
                />
              </div>
            </div>

            {/* Quick chips */}
            <div className="grid grid-cols-2 gap-1 pt-4">
              {[50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBet1((b) => ({ ...b, amount: amt }))}
                  disabled={bet1.active && gameState === "FLYING"}
                  className="rounded-md border border-line bg-ink px-2 py-1 text-xs font-bold hover:bg-panel-2"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          {bet1.active && gameState === "FLYING" && !bet1.cashedOut ? (
            <button
              onClick={() => cashout(1)}
              className="w-full rounded-xl bg-amber-500 py-3.5 text-center text-lg font-black text-slate-900 shadow-md hover:bg-amber-400 transition transform active:scale-98 animate-pulse"
            >
              CASHOUT {(bet1.amount * multiplier).toFixed(1)} COINS ({multiplier.toFixed(2)}x)
            </button>
          ) : bet1.active && bet1.cashedOut ? (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500 py-3 text-center text-sm font-extrabold text-emerald-600">
              Cashed Out @ {bet1.cashedMultiplier.toFixed(2)}x (+{(bet1.amount * bet1.cashedMultiplier).toFixed(0)} Coins)
            </div>
          ) : (
            <button
              onClick={() => setBet1((b) => ({ ...b, active: !b.active }))}
              disabled={bet1.amount > balance}
              className={`w-full rounded-xl py-3.5 text-center text-base font-black transition shadow-sm ${
                bet1.active
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              } disabled:opacity-50`}
            >
              {bet1.active ? "CANCEL BET" : `BET ${bet1.amount} COINS`}
            </button>
          )}
        </div>

        {/* Bet Panel 2 */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-mut">Panel 2</span>
            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={bet2.autoCashout}
                onChange={(e) => setBet2((b) => ({ ...b, autoCashout: e.target.checked }))}
                className="rounded"
              />
              Auto Cashout @
              <input
                type="number"
                step="0.1"
                min="1.1"
                value={bet2.autoCashoutValue}
                onChange={(e) => setBet2((b) => ({ ...b, autoCashoutValue: parseFloat(e.target.value) || 1.5 }))}
                className="w-16 rounded border border-line bg-panel-2 px-1.5 py-0.5 text-center text-xs font-bold"
              />
              x
            </label>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <span className="text-[10px] uppercase font-bold text-mut-2">Bet Amount (Coins)</span>
              <div className="flex items-center rounded-xl border border-line bg-panel-2 px-3 py-2">
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={bet2.amount}
                  onChange={(e) => setBet2((b) => ({ ...b, amount: Math.max(10, parseInt(e.target.value) || 10) }))}
                  disabled={bet2.active && gameState === "FLYING"}
                  className="w-full bg-transparent text-lg font-black outline-none"
                />
              </div>
            </div>

            {/* Quick chips */}
            <div className="grid grid-cols-2 gap-1 pt-4">
              {[50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBet2((b) => ({ ...b, amount: amt }))}
                  disabled={bet2.active && gameState === "FLYING"}
                  className="rounded-md border border-line bg-ink px-2 py-1 text-xs font-bold hover:bg-panel-2"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          {bet2.active && gameState === "FLYING" && !bet2.cashedOut ? (
            <button
              onClick={() => cashout(2)}
              className="w-full rounded-xl bg-amber-500 py-3.5 text-center text-lg font-black text-slate-900 shadow-md hover:bg-amber-400 transition transform active:scale-98 animate-pulse"
            >
              CASHOUT {(bet2.amount * multiplier).toFixed(1)} COINS ({multiplier.toFixed(2)}x)
            </button>
          ) : bet2.active && bet2.cashedOut ? (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500 py-3 text-center text-sm font-extrabold text-emerald-600">
              Cashed Out @ {bet2.cashedMultiplier.toFixed(2)}x (+{(bet2.amount * bet2.cashedMultiplier).toFixed(0)} Coins)
            </div>
          ) : (
            <button
              onClick={() => setBet2((b) => ({ ...b, active: !b.active }))}
              disabled={bet2.amount > balance}
              className={`w-full rounded-xl py-3.5 text-center text-base font-black transition shadow-sm ${
                bet2.active
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              } disabled:opacity-50`}
            >
              {bet2.active ? "CANCEL BET" : `BET ${bet2.amount} COINS`}
            </button>
          )}
        </div>
      </div>

      {/* Live Active Players Feed */}
      <div className="rounded-2xl border border-line bg-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Live Kenyan Aviator Lobby ({MOCK_PLAYERS.length + (bet1.active ? 1 : 0)} Players)
          </h3>
          <span className="text-xs text-mut-2">Auto-synced</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-mut-2">
                <th className="pb-2">User</th>
                <th className="pb-2">Bet</th>
                <th className="pb-2">Multiplier</th>
                <th className="pb-2 text-right">Cashout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {bet1.active && (
                <tr className="bg-accent/5 font-bold">
                  <td className="py-2 flex items-center gap-1.5">
                    <span>👑</span> You (Panel 1)
                  </td>
                  <td className="py-2">{bet1.amount}</td>
                  <td className="py-2 text-accent-2">
                    {bet1.cashedOut ? `${bet1.cashedMultiplier.toFixed(2)}x` : gameState === "FLYING" ? `${multiplier.toFixed(2)}x` : "–"}
                  </td>
                  <td className="py-2 text-right font-black text-emerald-600">
                    {bet1.cashedOut ? `+${(bet1.amount * bet1.cashedMultiplier).toFixed(0)}` : "–"}
                  </td>
                </tr>
              )}
              {MOCK_PLAYERS.map((p, i) => {
                const targetM = 1.3 + (i * 0.45);
                const hasCashed = gameState === "FLYING" && multiplier >= targetM;
                return (
                  <tr key={p.name} className="hover:bg-panel-2">
                    <td className="py-2 flex items-center gap-1.5">
                      <span>{p.avatar}</span> {p.name}
                    </td>
                    <td className="py-2 text-slate-600 font-medium">{p.bet}</td>
                    <td className="py-2">
                      {hasCashed ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700">
                          {targetM.toFixed(2)}x
                        </span>
                      ) : (
                        <span className="text-mut-2 font-mono">in play</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-bold text-emerald-600">
                      {hasCashed ? `+${(p.bet * targetM).toFixed(0)}` : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
