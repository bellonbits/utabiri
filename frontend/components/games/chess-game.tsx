"use client";

import { useEffect, useState } from "react";
import { ChessPieces } from "./chess-pieces";
import { sfx } from "@/lib/game-audio";
import { useGameWallet } from "@/lib/game-wallet";

type PieceColor = "w" | "b";
type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type Board = (Piece | null)[][];

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

const COACH_QUOTES = [
  "Way to go! You seized the initiative from your opponent right in the opening.",
  "Excellent center control! Keeping your pawns solid gives your knights room to maneuver.",
  "Great vision! Developing your minor pieces quickly puts maximum pressure on Black's king.",
  "Solid tactical choice! Look for outposts for your knight on d5 or f5.",
  "Nice defense! Maintaining a compact pawn structure prevents kingside incursions.",
  "Brilliant counterplay! Your bishop battery is slicing right across the board.",
];

export function ChessGame() {
  const { balance, modifyBalance } = useGameWallet();

  const [board, setBoard] = useState<Board>(() => JSON.parse(JSON.stringify(INITIAL_BOARD)));
  const [turn, setTurn] = useState<PieceColor>("w");
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [coachMsg, setCoachMsg] = useState(COACH_QUOTES[0]);
  const [evalScore, setEvalScore] = useState(0.4); // Positive means White is winning
  const [whiteAccuracy, setWhiteAccuracy] = useState(86.5);
  const [blackAccuracy, setBlackAccuracy] = useState(74.2);
  const [gameMode, setGameMode] = useState<"ai" | "local">("ai");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [wager, setWager] = useState(100);
  const [isWagerActive, setIsWagerActive] = useState(false);
  const [gameStatus, setGameStatus] = useState<"playing" | "checkmate" | "draw">("playing");

  const [classifications, setClassifications] = useState({
    brilliant: 1,
    great: 3,
    best: 8,
    excellent: 5,
    good: 3,
    book: 2,
    inaccuracy: 1,
    mistake: 0,
    blunder: 0,
  });

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
      if (inBounds(r + dir, c) && !b[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !b[r + dir * 2][c]) {
          moves.push([r + dir * 2, c]);
        }
      }
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
        if (inBounds(nr, nc) && (!b[nr][nc] || b[nr][nc]?.color === enemyColor)) {
          moves.push([nr, nc]);
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
          if (inBounds(nr, nc) && (!b[nr][nc] || b[nr][nc]?.color === enemyColor)) {
            moves.push([nr, nc]);
          }
        }
      }
    }

    return moves;
  };

  const executeMove = (fromR: number, fromC: number, toR: number, toC: number) => {
    const newBoard = board.map((row) => [...row]);
    const movingPiece = newBoard[fromR][fromC];
    const targetPiece = newBoard[toR][toC];
    if (!movingPiece) return;

    if (targetPiece) {
      sfx.playChessCapture();
    } else {
      sfx.playChessMove();
    }

    // Pawn Promotion
    if (movingPiece.type === "p" && (toR === 0 || toR === 7)) {
      movingPiece.type = "q";
    }

    newBoard[toR][toC] = movingPiece;
    newBoard[fromR][fromC] = null;

    setBoard(newBoard);
    setLastMove({ from: [fromR, fromC], to: [toR, toC] });
    setSelectedPos(null);
    setValidMoves([]);
    setMoveCount((c) => c + 1);

    // Update evaluation & coach commentary
    const deltaEval = (Math.random() * 0.6 - 0.2);
    setEvalScore((prev) => Math.max(-5, Math.min(5, parseFloat((prev + (movingPiece.color === "w" ? deltaEval : -deltaEval)).toFixed(1)))));
    setCoachMsg(COACH_QUOTES[Math.floor(Math.random() * COACH_QUOTES.length)]);

    if (movingPiece.color === "w") {
      setClassifications((prev) => ({ ...prev, best: prev.best + 1 }));
    }

    // Check King Capture
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

  const handleSquareClick = (r: number, c: number) => {
    if (gameStatus !== "playing") return;
    if (gameMode === "ai" && turn === "b") return;

    const clickedPiece = board[r][c];

    if (clickedPiece && clickedPiece.color === turn) {
      setSelectedPos([r, c]);
      setValidMoves(getMovesForSquare(board, r, c));
      return;
    }

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

  // AI response move
  useEffect(() => {
    if (gameMode !== "ai" || turn !== "b" || gameStatus !== "playing") return;

    const timer = setTimeout(() => {
      const allMoves: { from: [number, number]; to: [number, number]; score: number }[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c]?.color === "b") {
            const moves = getMovesForSquare(board, r, c);
            for (const [toR, toC] of moves) {
              const target = board[toR][toC];
              let score = target ? 10 : 0;
              if ((toR === 3 || toR === 4) && (toC === 3 || toC === 4)) score += 2;
              score += Math.random() * 2;
              allMoves.push({ from: [r, c], to: [toR, toC], score });
            }
          }
        }
      }

      if (allMoves.length === 0) {
        setGameStatus("draw");
        return;
      }

      allMoves.sort((a, b) => b.score - a.score);
      const chosen = allMoves[0];
      executeMove(chosen.from[0], chosen.from[1], chosen.to[0], chosen.to[1]);
    }, 450);

    return () => clearTimeout(timer);
  }, [turn, gameMode, gameStatus]);

  const resetBoard = () => {
    setBoard(JSON.parse(JSON.stringify(INITIAL_BOARD)));
    setTurn("w");
    setSelectedPos(null);
    setValidMoves([]);
    setLastMove(null);
    setGameStatus("playing");
    setMoveCount(0);
    setEvalScore(0.4);
  };

  const startWagerMatch = () => {
    if (wager > balance) return;
    modifyBalance(-wager);
    setIsWagerActive(true);
    resetBoard();
  };

  // Render a piece using authentic SVG
  const renderPiece = (piece: Piece) => {
    const Component = ChessPieces[piece.color][piece.type];
    return <Component size={46} className="pointer-events-none drop-shadow-md select-none transition-transform hover:scale-105" />;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-[#262522] text-white p-3.5 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">♟️</span>
          <span className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
            Chess.com Play & Analysis
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setGameMode("ai"); resetBoard(); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${gameMode === "ai" ? "bg-[#81b64c] text-white" : "bg-[#363431] text-stone-300 hover:text-white"}`}
          >
            vs Coach AI
          </button>
          <button
            onClick={() => { setGameMode("local"); resetBoard(); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${gameMode === "local" ? "bg-[#81b64c] text-white" : "bg-[#363431] text-stone-300 hover:text-white"}`}
          >
            Pass & Play
          </button>
          <button
            onClick={resetBoard}
            className="rounded-lg bg-[#363431] px-3 py-1.5 text-xs font-bold text-stone-300 hover:text-white"
          >
            Rematch
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr] items-start">
        {/* Left Side: Chess.com Game Review & Coach Panel */}
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-800 bg-[#21201d] text-white p-4 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
              <span className="h-3 w-3 rounded-full bg-[#81b64c]" />
              Game Review
            </div>
            <span className="text-xs text-stone-400 font-bold">{moveCount} moves</span>
          </div>

          {/* AI Coach Speech Bubble Card */}
          <div className="flex items-start gap-3 rounded-xl bg-[#2a2926] p-3 border border-stone-700/60 shadow-inner">
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-2xl shadow-md">
                👨‍💼
              </div>
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#81b64c] border-2 border-[#2a2926]" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#81b64c]">Coach Commentary</p>
              <p className="mt-0.5 text-xs text-stone-200 leading-snug font-medium">{coachMsg}</p>
            </div>
          </div>

          {/* Evaluation Graph / Bar */}
          <div className="rounded-xl bg-[#1b1a18] p-3 border border-stone-800">
            <div className="flex items-center justify-between text-xs font-bold text-stone-400 mb-1.5">
              <span>Engine Evaluation</span>
              <span className={evalScore >= 0 ? "text-[#81b64c]" : "text-rose-400"}>
                {evalScore >= 0 ? `+${evalScore.toFixed(1)}` : evalScore.toFixed(1)}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-stone-900 overflow-hidden flex">
              <div
                className="h-full bg-white transition-all duration-500 ease-out"
                style={{ width: `${Math.max(10, Math.min(90, 50 + evalScore * 8))}%` }}
              />
              <div className="h-full bg-stone-950 flex-1" />
            </div>
          </div>

          {/* Accuracy Badges */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-[#2a2926] p-2.5 border border-stone-800">
              <span className="text-[10px] font-bold uppercase text-stone-400">White (You)</span>
              <p className="text-lg font-black text-[#81b64c]">{whiteAccuracy}%</p>
              <span className="text-[10px] text-stone-400">Accuracy</span>
            </div>
            <div className="rounded-xl bg-[#2a2926] p-2.5 border border-stone-800">
              <span className="text-[10px] font-bold uppercase text-stone-400">Black (AI)</span>
              <p className="text-lg font-black text-stone-300">{blackAccuracy}%</p>
              <span className="text-[10px] text-stone-400">Accuracy</span>
            </div>
          </div>

          {/* Move Classification Breakdown */}
          <div className="rounded-xl bg-[#1e1d1a] p-3 border border-stone-800 space-y-1.5 text-xs">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 mb-2">Move Quality</p>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold"><span className="text-cyan-400">💎</span> Brilliant</span>
              <span className="rounded bg-cyan-950 px-2 py-0.5 font-black text-cyan-400">{classifications.brilliant}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold"><span className="text-blue-400">🌟</span> Great</span>
              <span className="rounded bg-blue-950 px-2 py-0.5 font-black text-blue-400">{classifications.great}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold"><span className="text-emerald-400">🟢</span> Best</span>
              <span className="rounded bg-emerald-950 px-2 py-0.5 font-black text-emerald-400">{classifications.best}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold"><span className="text-lime-400">🔵</span> Excellent</span>
              <span className="rounded bg-lime-950 px-2 py-0.5 font-black text-lime-400">{classifications.excellent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold"><span className="text-amber-400">🟡</span> Book</span>
              <span className="rounded bg-amber-950 px-2 py-0.5 font-black text-amber-400">{classifications.book}</span>
            </div>
          </div>

          {/* Stake Box */}
          <div className="rounded-xl bg-[#2a2926] p-3 border border-stone-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Coin Stakes</span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min="50"
                step="50"
                value={wager}
                onChange={(e) => setWager(Math.max(50, parseInt(e.target.value) || 50))}
                className="w-full rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-bold text-white outline-none border border-stone-700"
              />
              <button
                onClick={startWagerMatch}
                disabled={wager > balance}
                className="rounded-lg bg-[#81b64c] px-3.5 py-1.5 text-xs font-black text-white hover:bg-[#6c9a3f] transition disabled:opacity-50"
              >
                Stake
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Chess.com Board Stage */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-800 bg-[#262522] p-4 md:p-6 shadow-2xl">
          {/* Black Player Banner */}
          <div className="flex w-full max-w-[540px] items-center justify-between px-2 mb-2 text-white">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-stone-700 flex items-center justify-center font-bold text-sm shadow">
                🤖
              </div>
              <div>
                <p className="text-xs font-black text-stone-200">Utabiri Master (1850)</p>
                <p className="text-[10px] text-stone-400">Stockfish Depth 12</p>
              </div>
            </div>
            {turn === "b" && gameStatus === "playing" && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-400 animate-pulse">
                Thinking…
              </span>
            )}
          </div>

          {/* 8x8 Board Container with Chess.com Styling */}
          <div className="relative grid grid-cols-8 overflow-hidden rounded-xl border-4 border-[#1f1e1b] shadow-2xl w-full max-w-[540px] aspect-square select-none">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selectedPos?.[0] === r && selectedPos?.[1] === c;
                const isLastMoveFrom = lastMove?.from[0] === r && lastMove?.from[1] === c;
                const isLastMoveTo = lastMove?.to[0] === r && lastMove?.to[1] === c;
                const isValidDest = validMoves.some(([mr, mc]) => mr === r && mc === c);

                // Chess.com Square Background Colors
                let bgColor = isDark ? "#739552" : "#ebecd0";
                if (isLastMoveFrom || isLastMoveTo) {
                  bgColor = isDark ? "#b9ca43" : "#f5f682";
                }
                if (isSelected) {
                  bgColor = "#baca44";
                }

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    style={{ backgroundColor: bgColor }}
                    className="relative flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {/* Rank Number (on file a) */}
                    {c === 0 && (
                      <span
                        className="absolute left-1 top-0.5 text-[10px] font-black pointer-events-none"
                        style={{ color: isDark ? "#ebecd0" : "#739552" }}
                      >
                        {8 - r}
                      </span>
                    )}
                    {/* File Letter (on rank 1) */}
                    {r === 7 && (
                      <span
                        className="absolute bottom-0.5 right-1 text-[10px] font-black pointer-events-none"
                        style={{ color: isDark ? "#ebecd0" : "#739552" }}
                      >
                        {String.fromCharCode(97 + c)}
                      </span>
                    )}

                    {/* Legal Move Dot indicator */}
                    {isValidDest && !piece && (
                      <span className="absolute h-4 w-4 rounded-full bg-black/20 pointer-events-none" />
                    )}

                    {/* Legal Capture Ring indicator */}
                    {isValidDest && piece && (
                      <span className="absolute inset-1 rounded-full ring-4 ring-black/25 pointer-events-none" />
                    )}

                    {/* Authentic Vector Chess Piece */}
                    {piece && renderPiece(piece)}
                  </button>
                );
              })
            )}
          </div>

          {/* White Player Banner */}
          <div className="flex w-full max-w-[540px] items-center justify-between px-2 mt-2 text-white">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#81b64c] flex items-center justify-center font-bold text-sm text-slate-900 shadow">
                👤
              </div>
              <div>
                <p className="text-xs font-black text-stone-200">You (White)</p>
                <p className="text-[10px] text-stone-400">Active Competitor</p>
              </div>
            </div>
            {turn === "w" && gameStatus === "playing" && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#81b64c]/20 px-2.5 py-1 text-xs font-bold text-[#81b64c]">
                Your Turn
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
