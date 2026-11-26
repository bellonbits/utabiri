import React from "react";

type PieceProps = {
  className?: string;
  size?: number;
};

// Standard tournament vector chess pieces (Chess.com / cburnett standard)
export const ChessPieces = {
  w: {
    k: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" />
          <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" strokeLinecap="butt" strokeLinejoin="miter" />
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23v.5C20 16 10.5 13 6.5 19.5c-3 6 5 10.5 5 10.5v7z" fill="#fff" />
          <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
        </g>
      </svg>
    ),
    q: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-8 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-18 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z" strokeLinecap="butt" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" strokeLinecap="butt" />
          <path d="M11 38.5a35 35 1 0 0 23 0" fill="none" strokeLinecap="butt" />
          <path d="M11 29a35 35 1 0 1 23 0M12.5 31.5h20M11.5 34.5a35 35 1 0 0 22 0M10.5 37.5a35 35 1 0 0 24 0" fill="none" />
        </g>
      </svg>
    ),
    r: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-11h14l1.5 11H14zM12 9v4h21V9H12zm0 4h21l-1 5H13l-1-5zm-3-8v3h3V5H9zm7 0v3h3V5h-3zm7 0v3h3V5h-3zm7 0v3h3V5h-3z" strokeLinecap="butt" />
          <path d="M11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt" />
          <path d="M34 14l-3 3H14l-3-3" fill="none" />
          <path d="M31 17v12.5H14V17" fill="none" strokeLinejoin="miter" />
          <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" fill="none" />
          <path d="M11 35.5h23M9 38.5h27" fill="none" />
        </g>
      </svg>
    ),
    b: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <g fill="#fff" strokeLinecap="butt">
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
            <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
          </g>
          <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" strokeLinejoin="miter" />
        </g>
      </svg>
    ),
    n: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff" />
          <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0-.64 1.36-1 2-1 2-2.82 1.34-3 1.5-1.41-1.04 1.41-3.04 0-3-1.41 1.04-.64 2.36-1 3.5 0 1.5-1 1.5-2 1.5-1 0-.64-1.36-1-2-.5-1.5 2-2 2-4 0-3.5 3.5-7 7-9 3.5-2 9.5-3 12-1.5z" fill="#fff" />
          <circle cx="9.5" cy="25.5" r="1.5" fill="#000" />
          <circle cx="15" cy="14.5" r="1.2" fill="#000" />
          <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0" />
        </g>
      </svg>
    ),
    p: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <path
          d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
          fill="#fff"
          stroke="#000"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  b: {
    k: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" />
          <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" strokeLinecap="butt" strokeLinejoin="miter" />
          <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23v.5C20 16 10.5 13 6.5 19.5c-3 6 5 10.5 5 10.5v7z" fill="#000" />
          <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#fff" />
        </g>
      </svg>
    ),
    q: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <g fill="#000" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-8 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-18 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z" strokeLinecap="butt" />
          <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" strokeLinecap="butt" />
          <path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke="#fff" strokeLinecap="butt" />
          <path d="M11 29a35 35 1 0 1 23 0M12.5 31.5h20M11.5 34.5a35 35 1 0 0 22 0M10.5 37.5a35 35 1 0 0 24 0" fill="none" stroke="#fff" />
        </g>
      </svg>
    ),
    r: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <g fill="#000" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-11h14l1.5 11H14zM12 9v4h21V9H12zm0 4h21l-1 5H13l-1-5zm-3-8v3h3V5H9zm7 0v3h3V5h-3zm7 0v3h3V5h-3zm7 0v3h3V5h-3z" strokeLinecap="butt" />
          <path d="M11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt" />
          <path d="M12 35.5h21M9 38.5h27" fill="none" stroke="#fff" />
        </g>
      </svg>
    ),
    b: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <g fill="#000" strokeLinecap="butt">
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z" />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
            <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
          </g>
          <path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#fff" strokeLinejoin="miter" />
        </g>
      </svg>
    ),
    n: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000" />
          <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0-.64 1.36-1 2-1 2-2.82 1.34-3 1.5-1.41-1.04 1.41-3.04 0-3-1.41 1.04-.64 2.36-1 3.5 0 1.5-1 1.5-2 1.5-1 0-.64-1.36-1-2-.5-1.5 2-2 2-4 0-3.5 3.5-7 7-9 3.5-2 9.5-3 12-1.5z" fill="#000" />
          <circle cx="9.5" cy="25.5" r="1.5" fill="#fff" />
          <circle cx="15" cy="14.5" r="1.2" fill="#fff" />
          <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0" stroke="#000" />
        </g>
      </svg>
    ),
    p: ({ className = "", size = 48 }: PieceProps) => (
      <svg width={size} height={size} viewBox="0 0 45 45" className={className}>
        <path
          d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
          fill="#000"
          stroke="#000"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
};
