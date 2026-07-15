"use client";

import type { ReactNode } from "react";

function Butterfly({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 70" className={className} aria-hidden>
      <defs>
        <linearGradient id="y2k-wing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7df9ff" />
          <stop offset="100%" stopColor="#ff5eb8" />
        </linearGradient>
      </defs>
      <ellipse cx="28" cy="32" rx="22" ry="18" fill="url(#y2k-wing)" opacity="0.9" />
      <ellipse cx="62" cy="32" rx="22" ry="18" fill="url(#y2k-wing)" opacity="0.9" />
      <ellipse cx="22" cy="48" rx="14" ry="11" fill="#ff94d2" />
      <ellipse cx="68" cy="48" rx="14" ry="11" fill="#ff94d2" />
      <ellipse cx="45" cy="35" rx="4" ry="18" fill="#ffe0f4" />
      <circle cx="45" cy="18" r="5" fill="#fff0fa" />
    </svg>
  );
}

function ChromeHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden>
      <defs>
        <linearGradient id="y2k-heart" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff0fa" />
          <stop offset="35%" stopColor="#ff85cc" />
          <stop offset="70%" stopColor="#ff2d9b" />
          <stop offset="100%" stopColor="#e91e8c" />
        </linearGradient>
      </defs>
      <path
        fill="url(#y2k-heart)"
        d="M36 62 C10 42 4 28 14 18 C22 10 32 12 36 20 C40 12 50 10 58 18 C68 28 62 42 36 62Z"
      />
      <path
        fill="none"
        stroke="#fff0fa"
        strokeWidth="2"
        opacity="0.5"
        d="M24 24 C30 18 36 22 36 28"
      />
    </svg>
  );
}

function SparkleCluster({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path fill="#7df9ff" d="M32 6 34 24 52 26 34 28 32 46 30 28 12 26 30 24Z" />
      <path fill="#ff5eb8" d="M14 38 15 46 23 47 15 48 14 56 13 48 5 47 13 46Z" />
      <path fill="#ffe0f4" d="M48 40 49 48 57 49 49 50 48 58 47 50 39 49 47 48Z" />
    </svg>
  );
}

function Flower({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="36"
          cy="18"
          rx="10"
          ry="16"
          fill="#ff7ec8"
          transform={`rotate(${angle} 36 36)`}
        />
      ))}
      <circle cx="36" cy="36" r="10" fill="#fff6b0" />
      <circle cx="36" cy="36" r="5" fill="#ff2d9b" />
    </svg>
  );
}

function Alien({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 80" className={className} aria-hidden>
      <ellipse cx="36" cy="54" rx="26" ry="22" fill="#8dffb0" />
      <ellipse cx="36" cy="30" rx="24" ry="28" fill="#6eff96" />
      <ellipse cx="27" cy="28" rx="9" ry="13" fill="#1a0618" />
      <ellipse cx="45" cy="28" rx="9" ry="13" fill="#1a0618" />
      <ellipse cx="25" cy="25" rx="3" ry="4" fill="#fff0fa" opacity="0.75" />
      <ellipse cx="43" cy="25" rx="3" ry="4" fill="#fff0fa" opacity="0.75" />
      <path
        fill="none"
        stroke="#2a8f4a"
        strokeWidth="2"
        strokeLinecap="round"
        d="M30 42 Q36 46 42 42"
      />
      <ellipse cx="18" cy="58" rx="7" ry="5" fill="#6eff96" />
      <ellipse cx="54" cy="58" rx="7" ry="5" fill="#6eff96" />
    </svg>
  );
}

type StickerPlacement = {
  top: string;
  size: string;
  rotate: string;
  delay?: string;
  offset?: string;
  opacity?: number;
  sticker: ReactNode;
};

const LEFT_STICKERS: StickerPlacement[] = [
  {
    top: "4%",
    size: "w-[4.2rem] h-[4.2rem]",
    rotate: "-18deg",
    offset: "6px",
    sticker: <Butterfly className="h-full w-full drop-shadow-[0_0_10px_rgb(125_249_255/0.35)]" />,
  },
  {
    top: "14%",
    size: "w-12 h-12",
    rotate: "11deg",
    offset: "-10px",
    delay: "0.3s",
    opacity: 0.38,
    sticker: <ChromeHeart className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
  {
    top: "23%",
    size: "w-[3.4rem] h-[3.8rem]",
    rotate: "-7deg",
    delay: "1.1s",
    sticker: <Alien className="h-full w-full drop-shadow-[0_0_10px_rgb(110_255_150/0.35)]" />,
  },
  {
    top: "36%",
    size: "w-16 h-16",
    rotate: "15deg",
    offset: "12px",
    delay: "0.7s",
    sticker: <Flower className="h-full w-full" />,
  },
  {
    top: "47%",
    size: "w-[4.8rem] h-[3.8rem]",
    rotate: "-12deg",
    offset: "-6px",
    delay: "1.5s",
    sticker: <Butterfly className="h-full w-full drop-shadow-[0_0_10px_rgb(125_249_255/0.35)]" />,
  },
  {
    top: "59%",
    size: "w-14 h-14",
    rotate: "6deg",
    delay: "0.2s",
    opacity: 0.42,
    sticker: <ChromeHeart className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
  {
    top: "68%",
    size: "w-14 h-14",
    rotate: "-9deg",
    offset: "8px",
    delay: "0.9s",
    sticker: <Flower className="h-full w-full" />,
  },
  {
    top: "76%",
    size: "w-[3.6rem] h-[4rem]",
    rotate: "13deg",
    offset: "-12px",
    delay: "1.8s",
    sticker: <Alien className="h-full w-full drop-shadow-[0_0_10px_rgb(110_255_150/0.35)]" />,
  },
  {
    top: "87%",
    size: "w-[4rem] h-[3.2rem]",
    rotate: "-5deg",
    delay: "0.5s",
    sticker: <Butterfly className="h-full w-full drop-shadow-[0_0_10px_rgb(125_249_255/0.35)]" />,
  },
  {
    top: "93%",
    size: "w-11 h-11",
    rotate: "20deg",
    offset: "4px",
    delay: "1.3s",
    opacity: 0.35,
    sticker: <ChromeHeart className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
];

const RIGHT_STICKERS: StickerPlacement[] = [
  {
    top: "7%",
    size: "w-[3.5rem] h-[3.9rem]",
    rotate: "9deg",
    offset: "-8px",
    sticker: <Alien className="h-full w-full drop-shadow-[0_0_10px_rgb(110_255_150/0.35)]" />,
  },
  {
    top: "18%",
    size: "w-[4.5rem] h-[3.5rem]",
    rotate: "-14deg",
    offset: "10px",
    delay: "0.6s",
    sticker: <Butterfly className="h-full w-full drop-shadow-[0_0_10px_rgb(125_249_255/0.35)]" />,
  },
  {
    top: "29%",
    size: "w-14 h-14",
    rotate: "7deg",
    delay: "1.2s",
    sticker: <Flower className="h-full w-full" />,
  },
  {
    top: "41%",
    size: "w-12 h-12",
    rotate: "-16deg",
    offset: "-14px",
    delay: "0.4s",
    opacity: 0.4,
    sticker: <ChromeHeart className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
  {
    top: "52%",
    size: "w-[3.2rem] h-[3.6rem]",
    rotate: "12deg",
    offset: "6px",
    delay: "1.7s",
    sticker: <Alien className="h-full w-full drop-shadow-[0_0_10px_rgb(110_255_150/0.35)]" />,
  },
  {
    top: "61%",
    size: "w-16 h-16",
    rotate: "-8deg",
    delay: "0.8s",
    sticker: <Flower className="h-full w-full" />,
  },
  {
    top: "72%",
    size: "w-[4.6rem] h-[3.6rem]",
    rotate: "17deg",
    offset: "-6px",
    delay: "1.4s",
    sticker: <Butterfly className="h-full w-full drop-shadow-[0_0_10px_rgb(125_249_255/0.35)]" />,
  },
  {
    top: "81%",
    size: "w-[3.8rem] h-[3.8rem]",
    rotate: "-11deg",
    offset: "12px",
    delay: "0.1s",
    sticker: <ChromeHeart className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
  {
    top: "89%",
    size: "w-12 h-12",
    rotate: "5deg",
    delay: "2s",
    opacity: 0.36,
    sticker: <SparkleCluster className="h-full w-full" />,
  },
  {
    top: "95%",
    size: "w-[3.4rem] h-[3.8rem]",
    rotate: "-19deg",
    offset: "-10px",
    delay: "1s",
    sticker: <Alien className="h-full w-full drop-shadow-[0_0_10px_rgb(110_255_150/0.35)]" />,
  },
];

function StickerColumn({ side, items }: { side: "left" | "right"; items: StickerPlacement[] }) {
  return (
    <div
      className={`pointer-events-none absolute top-0 ${side === "left" ? "left-1 xl:left-4" : "right-1 xl:right-4"} h-full w-24 xl:w-28`}
      aria-hidden
    >
      {items.map((item, index) => (
        <div
          key={`${side}-${index}`}
          className={`y2k-sticker absolute ${item.size}`}
          style={{
            top: item.top,
            [side === "left" ? "left" : "right"]: item.offset ?? "0px",
            opacity: item.opacity ?? 0.45,
            ["--y2k-rotate" as string]: item.rotate,
            animationDelay: item.delay ?? "0s",
          }}
        >
          {item.sticker}
        </div>
      ))}
    </div>
  );
}

export function Y2kBackgroundStickers() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block" aria-hidden>
      <StickerColumn side="left" items={LEFT_STICKERS} />
      <StickerColumn side="right" items={RIGHT_STICKERS} />
    </div>
  );
}
