"use client";

import type { ReactNode } from "react";

function StarBurst({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <defs>
        <linearGradient id="y2k-star" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff9ed8" />
          <stop offset="50%" stopColor="#ff2d9b" />
          <stop offset="100%" stopColor="#c77dff" />
        </linearGradient>
      </defs>
      <path
        fill="url(#y2k-star)"
        d="M40 4 48 30 76 30 52 46 60 72 40 56 20 72 28 46 4 30 32 30Z"
      />
      <circle cx="40" cy="40" r="6" fill="#fff0fa" opacity="0.9" />
    </svg>
  );
}

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

function Smiley({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden>
      <circle cx="36" cy="36" r="32" fill="#fff6b0" />
      <circle cx="36" cy="36" r="32" fill="none" stroke="#ff2d9b" strokeWidth="3" />
      <circle cx="26" cy="30" r="4" fill="#ff2d9b" />
      <circle cx="46" cy="30" r="4" fill="#ff2d9b" />
      <path
        fill="none"
        stroke="#ff2d9b"
        strokeWidth="3"
        strokeLinecap="round"
        d="M24 44 Q36 56 48 44"
      />
    </svg>
  );
}

function Y2KBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 88 40" className={className} aria-hidden>
      <rect x="2" y="4" width="84" height="32" rx="16" fill="#ff2d9b" />
      <rect x="4" y="6" width="80" height="28" rx="14" fill="none" stroke="#fff0fa" strokeWidth="2" />
      <text
        x="44"
        y="27"
        textAnchor="middle"
        fill="#fff0fa"
        fontSize="16"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        Y2K
      </text>
    </svg>
  );
}

type StickerPlacement = {
  top: string;
  size: string;
  rotate: string;
  delay?: string;
  sticker: ReactNode;
};

const LEFT_STICKERS: StickerPlacement[] = [
  { top: "8%", size: "w-16 h-16", rotate: "-12deg", sticker: <StarBurst className="h-full w-full drop-shadow-[0_0_12px_rgb(255_45_155/0.35)]" /> },
  { top: "28%", size: "w-20 h-20", rotate: "8deg", delay: "0.8s", sticker: <Butterfly className="h-full w-full drop-shadow-[0_0_10px_rgb(125_249_255/0.3)]" /> },
  { top: "48%", size: "w-14 h-14", rotate: "-6deg", delay: "1.2s", sticker: <SparkleCluster className="h-full w-full" /> },
  { top: "66%", size: "w-[4.5rem] h-[4.5rem]", rotate: "14deg", delay: "0.4s", sticker: <ChromeHeart className="h-full w-full drop-shadow-[0_0_14px_rgb(255_94_210/0.4)]" /> },
  { top: "84%", size: "w-16 h-16", rotate: "-10deg", delay: "1.6s", sticker: <Flower className="h-full w-full" /> },
];

const RIGHT_STICKERS: StickerPlacement[] = [
  { top: "12%", size: "w-[5.5rem] h-10", rotate: "6deg", sticker: <Y2KBadge className="h-full w-full drop-shadow-[0_0_10px_rgb(255_45_155/0.45)]" /> },
  { top: "30%", size: "w-[4.5rem] h-[4.5rem]", rotate: "-8deg", delay: "0.6s", sticker: <Smiley className="h-full w-full" /> },
  { top: "50%", size: "w-20 h-20", rotate: "10deg", delay: "1s", sticker: <StarBurst className="h-full w-full drop-shadow-[0_0_12px_rgb(255_45_155/0.35)]" /> },
  { top: "68%", size: "w-16 h-16", rotate: "-14deg", delay: "1.4s", sticker: <Butterfly className="h-full w-full drop-shadow-[0_0_10px_rgb(125_249_255/0.3)]" /> },
  { top: "86%", size: "w-14 h-14", rotate: "4deg", delay: "0.2s", sticker: <SparkleCluster className="h-full w-full" /> },
];

function StickerColumn({ side, items }: { side: "left" | "right"; items: StickerPlacement[] }) {
  return (
    <div
      className={`pointer-events-none absolute top-0 ${side === "left" ? "left-2 xl:left-6" : "right-2 xl:right-6"} h-full w-20 xl:w-24`}
      aria-hidden
    >
      {items.map((item, index) => (
        <div
          key={`${side}-${index}`}
          className={`y2k-sticker absolute ${item.size} opacity-45`}
          style={{
            top: item.top,
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
