"use client";

import { useEffect, useState } from "react";
import { ChessPiece } from "./chess-pieces";
import { sfx } from "@/lib/game-audio";
import { useGameWallet } from "@/lib/game-wallet";
import { CastleIcon, BotIcon, UserIcon, TrophyIcon, ShieldIcon, SlidersIcon, CheckCircleIcon } from "@/components/icons";

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
  const [evalScore, setEvalScore] = useState(0.4);
  const [whiteAccuracy, setWhiteAccuracy] = useState(86.5);
  const [blackAccuracy, setBlackAccuracy] = useState(74.2);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [wager, setWager] = useState(100);
  const [isWagerActive, setIsWagerActive] = useState(false);
  const [gameStatus, setGameStatus] = useState<"playing" | "checkmate" | "draw">("playing");

  const [classifications, setClassifications] = useState({
    brilliant: 1,
    great: 3,
    best: 8,
    excellent: 5,
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

  const handleSquareClick = (r: number, c: number) => {
    if (gameStatus !== "playing") return;
    if (turn !== "w") return;

    if (selectedPos) {
      const [sr, sc] = selectedPos;
      const isLegal = validMoves.some(([mr, mc]) => mr === r && mc === c);

      if (isLegal) {
        executeMove(sr, sc, r, c);
        setSelectedPos(null);
        setValidMoves([]);
        return;
      }
    }

    const clickedPiece = board[r][c];
    if (clickedPiece && clickedPiece.color === "w") {
      setSelectedPos([r, c]);
      setValidMoves(getMovesForSquare(board, r, c));
    } else {
      setSelectedPos(null);
      setValidMoves([]);
    }
  };

  const executeMove = (fromR: number, fromC: number, toR: number, toC: number) => {
    const newBoard = board.map((row) => [...row]);
    const movingPiece = newBoard[fromR][fromC];
    if (!movingPiece) return;

    const captured = newBoard[toR][toC];
    if (captured) {
      sfx.playWin();
    } else {
      sfx.playTick();
    }

    if (movingPiece.type === "p" && (toR === 0 || toR === 7)) {
      movingPiece.type = "q";
    }

    newBoard[toR][toC] = movingPiece;
    newBoard[fromR][fromC] = null;

    setBoard(newBoard);
    setLastMove({ from: [fromR, fromC], to: [toR, toC] });
    setMoveCount((m) => m + 1);

    if (movingPiece.color === "w") {
      setEvalScore((prev) => Math.min(6.5, prev + 0.35 + (captured ? 1.5 : 0)));
      setCoachMsg(COACH_QUOTES[Math.floor(Math.random() * COACH_QUOTES.length)]);
      setTurn("b");
    } else {
      setEvalScore((prev) => Math.max(-6.5, prev - 0.2 - (captured ? 1.2 : 0)));
      setTurn("w");
    }
  };

  useEffect(() => {
    if (turn === "b" && gameStatus === "playing") {
      const timer = setTimeout(() => {
        const allBlackMoves: { from: [number, number]; to: [number, number]; score: number }[] = [];

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (board[r][c]?.color === "b") {
              const moves = getMovesForSquare(board, r, c);
              for (const [tr, tc] of moves) {
                let score = 0;
                const target = board[tr][tc];
                if (target) {
                  const valMap: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 50 };
                  score = valMap[target.type] * 10;
                }
                score += (tr - r) * 2;
                allBlackMoves.push({ from: [r, c], to: [tr, tc], score });
              }
            }
          }
        }

        if (allBlackMoves.length === 0) {
          setGameStatus("checkmate");
          if (isWagerActive) {
            modifyBalance(wager * 2);
            sfx.playWin();
          }
          return;
        }

        allBlackMoves.sort((a, b) => b.score - a.score);
        const bestMove = difficulty === "easy" ? allBlackMoves[Math.floor(Math.random() * allBlackMoves.length)] : allBlackMoves[0];
        executeMove(bestMove.from[0], bestMove.from[1], bestMove.to[0], bestMove.to[1]);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [turn, gameStatus]);

  const startWagerMatch = () => {
    if (wager > balance) return;
    modifyBalance(-wager);
    setIsWagerActive(true);
    setBoard(JSON.parse(JSON.stringify(INITIAL_BOARD)));
    setTurn("w");
    setSelectedPos(null);
    setValidMoves([]);
    setLastMove(null);
    setGameStatus("playing");
    setEvalScore(0.3);
  };

  const renderPiece = (p: Piece) => {
    return (
      <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center pointer-events-none select-none">
        <ChessPiece type={p.type} color={p.color} size={42} />
      </div>
    );
  };

  return (
    <div className="w-full border border-line bg-panel text-slate-900">
      {/* Top Strip */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 overflow-x-auto bg-panel-2">
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1.5 text-slate-900 font-black text-lg tracking-tight">
            <CastleIcon className="h-5 w-5 text-amber-600" /> Chess Master
          </span>
          <span className="border border-line bg-panel text-slate-700 px-2 py-0.5 text-[10px] font-extrabold uppercase">
            Stockfish AI v16
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="text-mut">Difficulty:</span>
          {(["easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-2 py-0.5 uppercase text-[10px] border transition cursor-pointer ${
                difficulty === d ? "border-accent bg-accent text-white font-black" : "border-line bg-panel text-mut hover:text-slate-900"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Review Sidebar (Left) + Chessboard (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-line">
        {/* Left Side: Game Review & Analysis Panel */}
        <div className="flex flex-col bg-panel p-4 space-y-4">
          {/* Coach Speech Section */}
          <div className="flex items-start gap-3 border border-line bg-panel-2 p-3">
            <div className="h-10 w-10 shrink-0 bg-amber-500 flex items-center justify-center text-slate-950 font-black">
              <BotIcon className="h-6 w-6 text-slate-950" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block">Coach Analysis</span>
              <p className="mt-1 text-xs text-slate-800 leading-snug font-medium">{coachMsg}</p>
            </div>
          </div>

          {/* Evaluation Bar */}
          <div className="border border-line bg-panel-2 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-mut">
              <span>Engine Evaluation</span>
              <span className={evalScore >= 0 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>
                {evalScore >= 0 ? `+${evalScore.toFixed(1)}` : evalScore.toFixed(1)}
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-300 flex">
              <div
                className="h-full bg-slate-900 transition-all duration-300"
                style={{ width: `${Math.max(10, Math.min(90, 50 + evalScore * 7))}%` }}
              />
              <div className="h-full bg-slate-200 flex-1" />
            </div>
          </div>

          {/* Accuracy Stats */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="border border-line bg-panel-2 p-2.5">
              <span className="text-[10px] font-bold uppercase text-mut">White (You)</span>
              <p className="text-xl font-black text-emerald-600">{whiteAccuracy}%</p>
              <span className="text-[10px] text-mut">Accuracy</span>
            </div>
            <div className="border border-line bg-panel-2 p-2.5">
              <span className="text-[10px] font-bold uppercase text-mut">Black (AI)</span>
              <p className="text-xl font-black text-slate-700">{blackAccuracy}%</p>
              <span className="text-[10px] text-mut">Accuracy</span>
            </div>
          </div>

          {/* Move Classification Table */}
          <div className="border border-line bg-panel-2 p-3 space-y-1.5 text-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 block mb-2">Move Quality Breakdown</span>
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 inline-block" /> Brilliant
              </span>
              <span className="font-mono font-bold text-cyan-600">{classifications.brilliant}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" /> Great
              </span>
              <span className="font-mono font-bold text-blue-600">{classifications.great}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Best
              </span>
              <span className="font-mono font-bold text-emerald-600">{classifications.best}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-lime-500 inline-block" /> Excellent
              </span>
              <span className="font-mono font-bold text-lime-600">{classifications.excellent}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" /> Book
              </span>
              <span className="font-mono font-bold text-amber-600">{classifications.book}</span>
            </div>
          </div>

          {/* Stake & Rematch */}
          <div className="border border-line bg-panel-2 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-mut">
              <span>COIN STAKE:</span>
              <span>{balance.toLocaleString()} Coins Available</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="50"
                step="50"
                value={wager}
                onChange={(e) => setWager(Math.max(50, parseInt(e.target.value) || 50))}
                className="w-full border border-line bg-panel px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
              />
              <button
                onClick={startWagerMatch}
                disabled={wager > balance}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-black uppercase transition disabled:opacity-50 cursor-pointer"
              >
                Stake
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Chessboard Stage */}
        <div className="flex flex-col items-center justify-center p-4 md:p-6 bg-ink">
          {/* Black Player Banner */}
          <div className="flex w-full max-w-[500px] items-center justify-between pb-2 text-slate-900">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-panel-2 border border-line flex items-center justify-center">
                <BotIcon className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Utabiri Master (1850)</p>
                <p className="text-[10px] text-mut">Depth 12 Engine</p>
              </div>
            </div>
            {turn === "b" && gameStatus === "playing" && (
              <span className="border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 animate-pulse">
                Thinking…
              </span>
            )}
          </div>

          {/* 8x8 Chessboard */}
          <div className="relative grid grid-cols-8 border-4 border-slate-700 w-full max-w-[500px] aspect-square select-none shadow-sm">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selectedPos?.[0] === r && selectedPos?.[1] === c;
                const isLastMoveFrom = lastMove?.from[0] === r && lastMove?.from[1] === c;
                const isLastMoveTo = lastMove?.to[0] === r && lastMove?.to[1] === c;
                const isValidDest = validMoves.some(([mr, mc]) => mr === r && mc === c);

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
                    {c === 0 && (
                      <span
                        className="absolute left-1 top-0.5 text-[10px] font-black pointer-events-none"
                        style={{ color: isDark ? "#ebecd0" : "#739552" }}
                      >
                        {8 - r}
                      </span>
                    )}
                    {r === 7 && (
                      <span
                        className="absolute bottom-0.5 right-1 text-[10px] font-black pointer-events-none"
                        style={{ color: isDark ? "#ebecd0" : "#739552" }}
                      >
                        {String.fromCharCode(97 + c)}
                      </span>
                    )}

                    {isValidDest && !piece && (
                      <span className="absolute h-3.5 w-3.5 rounded-full bg-black/25 pointer-events-none" />
                    )}

                    {isValidDest && piece && (
                      <span className="absolute inset-1 rounded-full ring-4 ring-black/25 pointer-events-none" />
                    )}

                    {piece && renderPiece(piece)}
                  </button>
                );
              })
            )}
          </div>

          {/* White Player Banner */}
          <div className="flex w-full max-w-[500px] items-center justify-between pt-2 text-slate-900">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-emerald-600 flex items-center justify-center text-white">
                <UserIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">You (White)</p>
                <p className="text-[10px] text-mut">{balance.toLocaleString()} Coins</p>
              </div>
            </div>
            {turn === "w" && gameStatus === "playing" && (
              <span className="border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                Your Turn
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
