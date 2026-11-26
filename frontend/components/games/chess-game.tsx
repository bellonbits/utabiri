"use client";

import { useEffect, useState } from "react";
import { sfx } from "@/lib/game-audio";
import { useGameWallet } from "@/lib/game-wallet";

type PieceColor = "w" | "b";
type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type Board = (Piece | null)[][]; // 8x8, board[row][col], row 0 is 8th rank (black side), row 7 is 1st rank (white side)

const INITIAL_BOARD: Board = [
  [
    { type: "r", color: "b" },
    { type: "n", color: "b" },
    { type: "b", color: "b" },
    { type: "q", color: "b" },
    { type: "k", color: "b" },
    { type: "b", color: "b" },
    { type: "n", color: "b" },
    { type: "r", color: "b" },
  ],
  Array(8).fill(null).map(() => ({ type: "p", color: "b" })),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null).map(() => ({ type: "p", color: "w" })),
  [
    { type: "r", color: "w" },
    { type: "n", color: "w" },
    { type: "b", color: "w" },
    { type: "q", color: "w" },
    { type: "k", color: "w" },
    { type: "b", color: "w" },
    { type: "n", color: "w" },
    { type: "r", color: "w" },
  ],
];

const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

export function ChessGame() {
  const { balance, modifyBalance } = useGameWallet();

  const [board, setBoard] = useState<Board>(() => JSON.parse(JSON.stringify(INITIAL_BOARD)));
  const [turn, setTurn] = useState<PieceColor>("w");
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedW, setCapturedW] = useState<PieceType[]>([]);
  const [capturedB, setCapturedB] = useState<PieceType[]>([]);
  const [gameMode, setGameMode] = useState<"ai" | "local">("ai");
  const [aiDifficulty, setAiDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [gameStatus, setGameStatus] = useState<"playing" | "checkmate" | "draw">("playing");
  const [wager, setWager] = useState(100);
  const [isWagerActive, setIsWagerActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleSound = () => {
    sfx.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Generate pseudo-legal moves for a square
  const getMovesForSquare = (b: Board, r: number, c: number): [number, number][] => {
    const piece = b[r][c];
    if (!piece) return [];
    const moves: [number, number][] = [];
    const color = piece.color;
    const enemyColor = color === "w" ? "b" : "w";

    const inBounds = (row: number, col: number) => row >= 0 && row < 8 && col >= 0 && col < 8;

    if (piece.type === "p") {
      const dir = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;

      // 1 step forward
      if (inBounds(r + dir, c) && !b[r + dir][c]) {
        moves.push([r + dir, c]);
        // 2 steps forward
        if (r === startRow && !b[r + dir * 2][c]) {
          moves.push([r + dir * 2, c]);
        }
      }

      // Diagonal captures
      for (const dc of [-1, 1]) {
        if (inBounds(r + dir, c + dc) && b[r + dir][c + dc]?.color === enemyColor) {
          moves.push([r + dir, c + dc]);
        }
      }
    }

    if (piece.type === "n") {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of knightOffsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc)) {
          if (!b[nr][nc] || b[nr][nc]?.color === enemyColor) {
            moves.push([nr, nc]);
          }
        }
      }
    }

    if (piece.type === "b" || piece.type === "q") {
      const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc)) {
          if (!b[nr][nc]) {
            moves.push([nr, nc]);
          } else {
            if (b[nr][nc]?.color === enemyColor) moves.push([nr, nc]);
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    }

    if (piece.type === "r" || piece.type === "q") {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc)) {
          if (!b[nr][nc]) {
            moves.push([nr, nc]);
          } else {
            if (b[nr][nc]?.color === enemyColor) moves.push([nr, nc]);
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    }

    if (piece.type === "k") {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(nr, nc)) {
            if (!b[nr][nc] || b[nr][nc]?.color === enemyColor) {
              moves.push([nr, nc]);
            }
          }
        }
      }
    }

    return moves;
  };

  // Convert row, col to algebraic chess coordinates (e.g. 7, 4 -> e1)
  const toAlgebraic = (r: number, c: number) => {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
    return `${files[c]}${ranks[r]}`;
  };

  // Move piece execution
  const executeMove = (fromR: number, fromC: number, toR: number, toC: number) => {
    const newBoard = board.map((row) => [...row]);
    const movingPiece = newBoard[fromR][fromC];
    const targetPiece = newBoard[toR][toC];
    if (!movingPiece) return;

    // Check capture
    if (targetPiece) {
      sfx.playChessCapture();
      if (targetPiece.color === "w") {
        setCapturedW((prev) => [...prev, targetPiece.type]);
      } else {
        setCapturedB((prev) => [...prev, targetPiece.type]);
      }
    } else {
      sfx.playChessMove();
    }

    // Pawn promotion to Queen
    if (movingPiece.type === "p" && (toR === 0 || toR === 7)) {
      movingPiece.type = "q";
    }

    newBoard[toR][toC] = movingPiece;
    newBoard[fromR][fromC] = null;

    const notation = `${movingPiece.type.toUpperCase() !== "P" ? movingPiece.type.toUpperCase() : ""}${toAlgebraic(toR, toC)}`;
    setMoveHistory((h) => [...h, notation]);

    setBoard(newBoard);
    setSelectedPos(null);
    setValidMoves([]);

    // Check if King was captured
    if (targetPiece?.type === "k") {
      setGameStatus("checkmate");
      if (movingPiece.color === "w" && isWagerActive) {
        modifyBalance(Math.round(wager * 1.9));
        sfx.playWin();
      }
      return;
    }

    setTurn(turn === "w" ? "b" : "w");
  };

  // Handle Square click by human
  const handleSquareClick = (r: number, c: number) => {
    if (gameStatus !== "playing") return;
    if (gameMode === "ai" && turn === "b") return; // waiting for AI

    const clickedPiece = board[r][c];

    // If an own piece is clicked, select it
    if (clickedPiece && clickedPiece.color === turn) {
      setSelectedPos([r, c]);
      setValidMoves(getMovesForSquare(board, r, c));
      return;
    }

    // If a destination was clicked while piece is selected
    if (selectedPos) {
      const [fromR, fromC] = selectedPos;
      const isValid = validMoves.some(([mr, mc]) => mr === r && mc === c);
      if (isValid) {
        executeMove(fromR, fromC, r, c);
      } else {
        setSelectedPos(null);
        setValidMoves([]);
      }
    }
  };

  // Simple Minimax AI move for Black
  useEffect(() => {
    if (gameMode !== "ai" || turn !== "b" || gameStatus !== "playing") return;

    const timer = setTimeout(() => {
      // Gather all possible moves for Black
      const allMoves: { from: [number, number]; to: [number, number]; score: number }[] = [];

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c]?.color === "b") {
            const moves = getMovesForSquare(board, r, c);
            for (const [toR, toC] of moves) {
              const target = board[toR][toC];
              let score = 0;
              if (target) {
                score += PIECE_VALUES[target.type] * 10;
              }
              // Center control preference
              if ((toR === 3 || toR === 4) && (toC === 3 || toC === 4)) {
                score += 2;
              }
              // Slight random jitter for variance
              score += Math.random() * (aiDifficulty === "easy" ? 4 : 1.5);
              allMoves.push({ from: [r, c], to: [toR, toC], score });
            }
          }
        }
      }

      if (allMoves.length === 0) {
        setGameStatus("draw");
        return;
      }

      // Pick move based on difficulty
      allMoves.sort((a, b) => b.score - a.score);
      const chosenMove =
        aiDifficulty === "hard"
          ? allMoves[0]
          : aiDifficulty === "medium"
          ? allMoves[Math.min(allMoves.length - 1, Math.floor(Math.random() * 2))]
          : allMoves[Math.floor(Math.random() * Math.min(5, allMoves.length))];

      executeMove(chosenMove.from[0], chosenMove.from[1], chosenMove.to[0], chosenMove.to[1]);
    }, 450);

    return () => clearTimeout(timer);
  }, [turn, gameMode, gameStatus]);

  const resetGame = () => {
    setBoard(JSON.parse(JSON.stringify(INITIAL_BOARD)));
    setTurn("w");
    setSelectedPos(null);
    setValidMoves([]);
    setMoveHistory([]);
    setCapturedW([]);
    setCapturedB([]);
    setGameStatus("playing");
  };

  const startWagerMatch = () => {
    if (wager > balance) return;
    modifyBalance(-wager);
    setIsWagerActive(true);
    resetGame();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Sound & Controls header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-panel-2 p-1 text-xs font-bold">
            <button
              onClick={() => { setGameMode("ai"); resetGame(); }}
              className={`rounded-md px-3 py-1 transition ${gameMode === "ai" ? "bg-accent text-white" : "text-mut"}`}
            >
              🤖 vs Utabiri AI
            </button>
            <button
              onClick={() => { setGameMode("local"); resetGame(); }}
              className={`rounded-md px-3 py-1 transition ${gameMode === "local" ? "bg-accent text-white" : "text-mut"}`}
            >
              👥 Pass & Play
            </button>
          </div>

          {gameMode === "ai" && (
            <select
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value as "easy" | "medium" | "hard")}
              className="rounded-lg border border-line bg-panel-2 px-2.5 py-1 text-xs font-bold outline-none"
            >
              <option value="easy">Level: Easy</option>
              <option value="medium">Level: Medium</option>
              <option value="hard">Level: Master</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetGame}
            className="rounded-lg border border-line px-3 py-1 text-xs font-bold hover:bg-panel-2"
          >
            Reset Board
          </button>
          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold hover:bg-panel-2"
          >
            {soundEnabled ? "🔊 ON" : "🔇 OFF"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Chessboard Container */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-panel p-4 md:p-6 shadow-sm">
          {/* Black captured pieces tray */}
          <div className="flex h-8 w-full max-w-[480px] items-center justify-between px-2 text-sm">
            <div className="flex items-center gap-1 font-mono text-slate-800">
              <span className="font-bold text-xs mr-2">Black (AI)</span>
              {capturedW.map((p, i) => (
                <span key={i} className="text-lg">{PIECE_SYMBOLS.w[p]}</span>
              ))}
            </div>
            {turn === "b" && gameStatus === "playing" && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Thinking…
              </span>
            )}
          </div>

          {/* 8x8 Board */}
          <div className="relative mt-2 grid grid-cols-8 overflow-hidden rounded-xl border-4 border-slate-800 shadow-2xl w-full max-w-[480px] aspect-square">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selectedPos?.[0] === r && selectedPos?.[1] === c;
                const isValidDest = validMoves.some(([mr, mc]) => mr === r && mc === c);

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative flex items-center justify-center text-3xl md:text-4xl font-normal select-none transition-colors ${
                      isDark ? "bg-[#b58863]" : "bg-[#f0d9b5]"
                    } ${isSelected ? "ring-4 ring-inset ring-amber-400 bg-amber-200" : ""}`}
                  >
                    {/* Rank & File coordinates */}
                    {c === 0 && (
                      <span className={`absolute left-0.5 top-0.5 text-[9px] font-bold ${isDark ? "text-[#f0d9b5]" : "text-[#b58863]"}`}>
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span className={`absolute bottom-0.5 right-1 text-[9px] font-bold ${isDark ? "text-[#f0d9b5]" : "text-[#b58863]"}`}>
                        {String.fromCharCode(97 + c)}
                      </span>
                    )}

                    {/* Valid move dot indicator */}
                    {isValidDest && (
                      <span className={`absolute h-4 w-4 rounded-full ${piece ? "ring-4 ring-rose-500 bg-transparent" : "bg-black/25"}`} />
                    )}

                    {/* Chess Piece Symbol */}
                    {piece && (
                      <span className={`transform transition hover:scale-105 active:scale-95 ${
                        piece.color === "w" ? "text-slate-50 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" : "text-slate-950"
                      }`}>
                        {PIECE_SYMBOLS[piece.color][piece.type]}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* White captured pieces tray */}
          <div className="flex h-8 w-full max-w-[480px] items-center justify-between px-2 mt-2 text-sm">
            <div className="flex items-center gap-1 font-mono text-slate-800">
              <span className="font-bold text-xs mr-2">White (You)</span>
              {capturedB.map((p, i) => (
                <span key={i} className="text-lg">{PIECE_SYMBOLS.b[p]}</span>
              ))}
            </div>
            {turn === "w" && gameStatus === "playing" && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Your Turn
              </span>
            )}
          </div>

          {gameStatus === "checkmate" && (
            <div className="mt-4 rounded-xl border border-emerald-500 bg-emerald-500/15 px-6 py-3 text-center text-sm font-extrabold text-emerald-600 animate-bounce">
              👑 Checkmate! Game Over.
            </div>
          )}
        </div>

        {/* Sidebar: Move Log & Coins Wager */}
        <div className="flex flex-col gap-4">
          {/* Wager Challenge Box */}
          <div className="rounded-2xl border border-line bg-panel p-4 shadow-sm">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Utabiri Chess Stakes
            </h3>
            <p className="mt-1 text-xs text-mut-2">
              Wager virtual coins against Utabiri AI. Win up to 1.9x payout!
            </p>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min="50"
                step="50"
                value={wager}
                onChange={(e) => setWager(Math.max(50, parseInt(e.target.value) || 50))}
                className="w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-base font-bold outline-none"
              />
              <button
                onClick={startWagerMatch}
                disabled={wager > balance}
                className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-900 hover:bg-amber-400 disabled:opacity-50"
              >
                STAKE MATCH
              </button>
            </div>
          </div>

          {/* Algebraic Move Notation History */}
          <div className="flex-1 rounded-2xl border border-line bg-panel p-4 shadow-sm min-h-[220px]">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-mut-2 mb-2">
              Move Notation History
            </h3>
            <div className="max-h-[240px] overflow-y-auto pr-1">
              {moveHistory.length === 0 ? (
                <p className="text-xs text-mut-2">First move by White…</p>
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono">
                  {moveHistory.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      {idx % 2 === 0 && <span className="text-mut-2 w-6">{Math.floor(idx / 2) + 1}.</span>}
                      <span className="font-bold text-slate-800">{m}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
