"use client";

import type { ReactNode } from "react";

function StarBurst({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <path
        fill="#ff2d9b"
        d="M40 4 48 30 76 30 52 46 60 72 40 56 20 72 28 46 4 30 32 30Z"
      />
      <path
        fill="#ff9ed8"
        opacity="0.85"
        d="M40 16 44 32 60 32 48 42 52 58 40 48 28 58 32 42 20 32 36 32Z"
      />
      <circle cx="40" cy="40" r="5" fill="#fff0fa" opacity="0.95" />
    </svg>
  );
}

function ChromeHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden>
      <path
        fill="#ff5eb8"
        d="M36 62 C10 42 4 28 14 18 C22 10 32 12 36 20 C40 12 50 10 58 18 C68 28 62 42 36 62Z"
      />
      <path
        fill="#ffc8eb"
        opacity="0.7"
        d="M36 54 C18 38 14 28 20 22 C26 16 32 18 36 24 C40 18 46 16 52 22 C58 28 54 38 36 54Z"
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

function HeartPair({ className }: { className?: string }) {
  const heartPath =
    "M36 62 C10 42 4 28 14 18 C22 10 32 12 36 20 C40 12 50 10 58 18 C68 28 62 42 36 62Z";

  return (
    <svg viewBox="0 0 100 72" className={className} aria-hidden overflow="visible">
      <g transform="translate(0 8) scale(0.78)">
        <path fill="#ff85cc" opacity="0.85" d={heartPath} />
      </g>
      <g transform="translate(30 0) scale(0.9)">
        <path fill="#ff2d9b" d={heartPath} />
      </g>
      <circle cx="62" cy="20" r="3" fill="#fff0fa" opacity="0.6" />
    </svg>
  );
}

function HeartStack({ className }: { className?: string }) {
  const heartPath =
    "M36 62 C10 42 4 28 14 18 C22 10 32 12 36 20 C40 12 50 10 58 18 C68 28 62 42 36 62Z";

  return (
    <svg viewBox="0 0 100 88" className={className} aria-hidden overflow="visible">
      <g transform="translate(0 22) scale(0.56)">
        <path fill="#ffa8dc" opacity="0.8" d={heartPath} />
      </g>
      <g transform="translate(16 10) scale(0.68)">
        <path fill="#ff5eb8" opacity="0.9" d={heartPath} />
      </g>
      <g transform="translate(32 0) scale(0.8)">
        <path fill="#e91e8c" d={heartPath} />
      </g>
    </svg>
  );
}

function TinyHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path
        fill="#ff94d2"
        d="M20 34 C8 24 4 16 10 10 C14 6 18 8 20 12 C22 8 26 6 30 10 C36 16 32 24 20 34Z"
      />
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

function FlowerDaisy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <ellipse
          key={angle}
          cx="36"
          cy="14"
          rx="7"
          ry="14"
          fill="#ffe0f4"
          transform={`rotate(${angle} 36 36)`}
        />
      ))}
      <circle cx="36" cy="36" r="11" fill="#fff6b0" />
      <circle cx="36" cy="36" r="6" fill="#ff9ed8" />
    </svg>
  );
}

function FlowerBurst({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 68 68" className={className} aria-hidden>
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <ellipse
          key={angle}
          cx="34"
          cy="12"
          rx="9"
          ry="15"
          fill="#c77dff"
          opacity="0.9"
          transform={`rotate(${angle} 34 34)`}
        />
      ))}
      <circle cx="34" cy="34" r="9" fill="#ff5eb8" />
      <circle cx="34" cy="34" r="4" fill="#fff0fa" />
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

function UfoSaucer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 56" className={className} aria-hidden>
      <ellipse cx="48" cy="44" rx="44" ry="7" fill="#7df9ff" opacity="0.35" />
      <ellipse cx="48" cy="34" rx="42" ry="10" fill="#b8e8ff" />
      <ellipse cx="48" cy="31" rx="40" ry="8" fill="#8ecfff" />
      <ellipse cx="48" cy="22" rx="18" ry="14" fill="#d4f7ff" opacity="0.95" />
      <ellipse cx="48" cy="20" rx="14" ry="10" fill="#a8e8ff" opacity="0.8" />
      <ellipse cx="48" cy="34" rx="44" ry="4" fill="#5eb8ff" opacity="0.7" />
      {[18, 30, 42, 54, 66, 78].map((x) => (
        <circle key={x} cx={x} cy="36" r="3" fill={x % 2 === 0 ? "#ff5eb8" : "#7df9ff"} />
      ))}
      <ellipse cx="48" cy="48" rx="28" ry="4" fill="#ff85cc" opacity="0.25" />
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
    sticker: <StarBurst className="h-full w-full drop-shadow-[0_0_12px_rgb(255_45_155/0.4)]" />,
  },
  {
    top: "13%",
    size: "w-[4.5rem] h-[4rem]",
    rotate: "11deg",
    offset: "-10px",
    delay: "0.3s",
    opacity: 0.42,
    sticker: <HeartPair className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
  {
    top: "22%",
    size: "w-[5rem] h-[3.2rem]",
    rotate: "-5deg",
    delay: "1.1s",
    sticker: <UfoSaucer className="h-full w-full drop-shadow-[0_0_14px_rgb(125_249_255/0.35)]" />,
  },
  {
    top: "33%",
    size: "w-16 h-16",
    rotate: "15deg",
    offset: "12px",
    delay: "0.7s",
    sticker: <Flower className="h-full w-full" />,
  },
  {
    top: "42%",
    size: "w-12 h-12",
    rotate: "-8deg",
    offset: "-6px",
    delay: "1.5s",
    opacity: 0.4,
    sticker: <TinyHeart className="h-full w-full drop-shadow-[0_0_8px_rgb(255_94_210/0.35)]" />,
  },
  {
    top: "51%",
    size: "w-[4.8rem] h-[3.8rem]",
    rotate: "-12deg",
    offset: "4px",
    delay: "0.9s",
    sticker: <StarBurst className="h-full w-full drop-shadow-[0_0_12px_rgb(255_45_155/0.35)]" />,
  },
  {
    top: "60%",
    size: "w-[4.2rem] h-[4.8rem]",
    rotate: "6deg",
    delay: "0.2s",
    sticker: <HeartStack className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
  {
    top: "69%",
    size: "w-14 h-14",
    rotate: "-9deg",
    offset: "8px",
    delay: "1.3s",
    sticker: <FlowerDaisy className="h-full w-full" />,
  },
  {
    top: "77%",
    size: "w-[3.6rem] h-[4rem]",
    rotate: "13deg",
    offset: "-12px",
    delay: "1.8s",
    sticker: <Alien className="h-full w-full drop-shadow-[0_0_10px_rgb(110_255_150/0.35)]" />,
  },
  {
    top: "85%",
    size: "w-[5.2rem] h-[3rem]",
    rotate: "4deg",
    delay: "0.5s",
    sticker: <UfoSaucer className="h-full w-full drop-shadow-[0_0_14px_rgb(125_249_255/0.35)]" />,
  },
  {
    top: "92%",
    size: "w-14 h-14",
    rotate: "18deg",
    offset: "4px",
    delay: "1.6s",
    opacity: 0.38,
    sticker: <FlowerBurst className="h-full w-full" />,
  },
  {
    top: "27%",
    size: "w-11 h-11",
    rotate: "22deg",
    offset: "-4px",
    delay: "0.35s",
    opacity: 0.4,
    sticker: <ChromeHeart className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
];

const RIGHT_STICKERS: StickerPlacement[] = [
  {
    top: "6%",
    size: "w-[4.8rem] h-[2.8rem]",
    rotate: "8deg",
    offset: "-8px",
    sticker: <UfoSaucer className="h-full w-full drop-shadow-[0_0_14px_rgb(125_249_255/0.35)]" />,
  },
  {
    top: "15%",
    size: "w-[4.5rem] h-[3.5rem]",
    rotate: "-14deg",
    offset: "10px",
    delay: "0.6s",
    sticker: <StarBurst className="h-full w-full drop-shadow-[0_0_12px_rgb(255_45_155/0.4)]" />,
  },
  {
    top: "24%",
    size: "w-[4.4rem] h-[3.8rem]",
    rotate: "9deg",
    delay: "1.2s",
    opacity: 0.43,
    sticker: <HeartPair className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
  {
    top: "35%",
    size: "w-14 h-14",
    rotate: "7deg",
    offset: "-6px",
    delay: "0.4s",
    sticker: <Flower className="h-full w-full" />,
  },
  {
    top: "44%",
    size: "w-12 h-12",
    rotate: "-16deg",
    offset: "-14px",
    delay: "1.7s",
    opacity: 0.4,
    sticker: <ChromeHeart className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
  {
    top: "53%",
    size: "w-[4.6rem] h-[2.9rem]",
    rotate: "12deg",
    offset: "6px",
    delay: "0.8s",
    sticker: <UfoSaucer className="h-full w-full drop-shadow-[0_0_14px_rgb(125_249_255/0.35)]" />,
  },
  {
    top: "62%",
    size: "w-16 h-16",
    rotate: "-8deg",
    delay: "1.4s",
    sticker: <FlowerDaisy className="h-full w-full" />,
  },
  {
    top: "71%",
    size: "w-[4rem] h-[4.6rem]",
    rotate: "14deg",
    offset: "-6px",
    delay: "0.1s",
    sticker: <HeartStack className="h-full w-full drop-shadow-[0_0_12px_rgb(255_94_210/0.4)]" />,
  },
  {
    top: "80%",
    size: "w-[4.6rem] h-[3.6rem]",
    rotate: "17deg",
    offset: "8px",
    delay: "1.9s",
    sticker: <StarBurst className="h-full w-full drop-shadow-[0_0_12px_rgb(255_45_155/0.35)]" />,
  },
  {
    top: "88%",
    size: "w-14 h-14",
    rotate: "-11deg",
    offset: "12px",
    delay: "2s",
    sticker: <FlowerBurst className="h-full w-full" />,
  },
  {
    top: "95%",
    size: "w-[3.4rem] h-[3.8rem]",
    rotate: "-19deg",
    offset: "-10px",
    delay: "1s",
    sticker: <Alien className="h-full w-full drop-shadow-[0_0_10px_rgb(110_255_150/0.35)]" />,
  },
  {
    top: "38%",
    size: "w-10 h-10",
    rotate: "-9deg",
    offset: "10px",
    delay: "1.5s",
    opacity: 0.37,
    sticker: <TinyHeart className="h-full w-full drop-shadow-[0_0_8px_rgb(255_94_210/0.35)]" />,
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
