"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";

function HeartClassic({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path fill="#ff5eb8" d="M32 56 C10 40 2 28 10 16 C18 6 28 8 32 18 C36 8 46 6 54 16 C62 28 54 40 32 56Z" />
      <path fill="#ffc8eb" fillOpacity="0.65" d="M32 48 C16 36 10 26 16 20 C22 14 28 16 32 22 C36 16 42 14 48 20 C54 26 48 36 32 48Z" />
    </svg>
  );
}

function HeartChrome({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path fill="#ff2d9b" d="M32 54 C12 38 4 26 12 16 C20 8 30 10 32 18 C34 10 44 8 52 16 C60 26 52 38 32 54Z" />
      <path fill="#ffe0f4" fillOpacity="0.55" d="M24 22 C28 18 32 20 32 24 C32 20 36 18 40 22" />
      <path fill="none" stroke="#fff0fa" strokeOpacity="0.5" strokeWidth="1.5" d="M22 24 C28 18 36 20 40 26" />
    </svg>
  );
}

function HeartPair({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 88 56" className={className} aria-hidden>
      <path fill="#ff7ec8" d="M24 48 C8 34 2 24 8 16 C14 8 22 10 24 16 C26 10 34 8 40 16 C46 24 40 34 24 48Z" />
      <path fill="#ff5eb8" d="M52 48 C36 34 30 24 36 16 C42 8 50 10 52 16 C54 10 62 8 68 16 C74 24 68 34 52 48Z" />
    </svg>
  );
}

function HeartTiny({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path fill="#ff94d2" d="M20 34 C8 24 4 16 10 10 C14 6 18 8 20 12 C22 8 26 6 30 10 C36 16 32 24 20 34Z" />
    </svg>
  );
}

function HeartSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path fill="#e91e8c" d="M32 52 C14 38 6 28 14 18 C20 10 28 12 32 18 C36 12 44 10 50 18 C58 28 50 38 32 52Z" />
      <path fill="none" stroke="#ffc8eb" strokeWidth="2" d="M32 8 L32 14 M32 50 L32 56 M8 30 L14 30 M50 30 L56 30" />
      <circle cx="32" cy="8" r="2" fill="#fff0fa" />
      <circle cx="56" cy="30" r="2" fill="#fff0fa" />
    </svg>
  );
}

function FlowerDaisy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="14" r="10" fill="#ff94d2" />
      <circle cx="48" cy="24" r="10" fill="#ff7ec8" />
      <circle cx="44" cy="42" r="10" fill="#ff5eb8" />
      <circle cx="20" cy="42" r="10" fill="#ff94d2" />
      <circle cx="16" cy="24" r="10" fill="#ffa8dc" />
      <circle cx="32" cy="32" r="9" fill="#ffe0f4" />
      <circle cx="32" cy="32" r="4.5" fill="#ff2d9b" />
    </svg>
  );
}

function FlowerBurst({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path fill="#ff5eb8" d="M32 6 L36 24 L54 20 L40 32 L54 44 L36 40 L32 58 L28 40 L10 44 L24 32 L10 20 L28 24 Z" />
      <circle cx="32" cy="32" r="7" fill="#ffc8eb" />
      <circle cx="32" cy="32" r="3.5" fill="#ff2d9b" />
    </svg>
  );
}

function FlowerDots({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="8" fill="#ff2d9b" />
      <circle cx="32" cy="16" r="6" fill="#ffa8dc" />
      <circle cx="46" cy="24" r="6" fill="#ff94d2" />
      <circle cx="46" cy="40" r="6" fill="#ff7ec8" />
      <circle cx="32" cy="48" r="6" fill="#ff5eb8" />
      <circle cx="18" cy="40" r="6" fill="#ffa8dc" />
      <circle cx="18" cy="24" r="6" fill="#ffc8eb" />
    </svg>
  );
}

function FlowerSoft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden>
      <ellipse cx="36" cy="24" rx="14" ry="18" fill="#ff94d2" />
      <ellipse cx="24" cy="36" rx="14" ry="18" fill="#ff7ec8" transform="rotate(-50 24 36)" />
      <ellipse cx="48" cy="36" rx="14" ry="18" fill="#ff5eb8" transform="rotate(50 48 36)" />
      <circle cx="36" cy="36" r="8" fill="#ffe0f4" />
    </svg>
  );
}

function AlienHead({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 72" className={className} aria-hidden>
      <ellipse cx="32" cy="34" rx="24" ry="28" fill="#6eff96" />
      <ellipse cx="32" cy="38" rx="20" ry="22" fill="#4dffa8" />
      {children}
    </svg>
  );
}

function AlienHappy({ className }: { className?: string }) {
  return (
    <AlienHead className={className}>
      <ellipse cx="22" cy="32" rx="7" ry="9" fill="#1a0618" />
      <ellipse cx="42" cy="32" rx="7" ry="9" fill="#1a0618" />
      <ellipse cx="23" cy="30" rx="2.5" ry="3" fill="#fff0fa" />
      <ellipse cx="43" cy="30" rx="2.5" ry="3" fill="#fff0fa" />
      <path fill="none" stroke="#2ee6b8" strokeWidth="2" strokeLinecap="round" d="M24 46 Q32 52 40 46" />
    </AlienHead>
  );
}

function AlienWink({ className }: { className?: string }) {
  return (
    <AlienHead className={className}>
      <path fill="none" stroke="#1a0618" strokeWidth="3" strokeLinecap="round" d="M16 32 Q22 28 28 32" />
      <ellipse cx="42" cy="32" rx="7" ry="9" fill="#1a0618" />
      <ellipse cx="43" cy="30" rx="2.5" ry="3" fill="#fff0fa" />
      <path fill="none" stroke="#2ee6b8" strokeWidth="2" strokeLinecap="round" d="M25 47 Q32 51 39 47" />
    </AlienHead>
  );
}

function AlienSurprised({ className }: { className?: string }) {
  return (
    <AlienHead className={className}>
      <circle cx="22" cy="32" r="8" fill="#1a0618" />
      <circle cx="42" cy="32" r="8" fill="#1a0618" />
      <circle cx="23" cy="30" r="3" fill="#fff0fa" />
      <circle cx="43" cy="30" r="3" fill="#fff0fa" />
      <ellipse cx="32" cy="48" rx="6" ry="8" fill="#1a0618" />
      <ellipse cx="32" cy="46" rx="3" ry="4" fill="#2ee6b8" />
    </AlienHead>
  );
}

function AlienLove({ className }: { className?: string }) {
  return (
    <AlienHead className={className}>
      <path fill="#ff5eb8" d="M22 34 C18 30 14 30 14 34 C14 38 22 42 22 42 C22 42 30 38 30 34 C30 30 26 30 22 34Z" />
      <path fill="#ff5eb8" d="M42 34 C38 30 34 30 34 34 C34 38 42 42 42 42 C42 42 50 38 50 34 C50 30 46 30 42 34Z" />
      <path fill="none" stroke="#2ee6b8" strokeWidth="2" strokeLinecap="round" d="M24 48 Q32 54 40 48" />
    </AlienHead>
  );
}

function AlienCool({ className }: { className?: string }) {
  return (
    <AlienHead className={className}>
      <rect x="12" y="28" width="40" height="10" rx="5" fill="#1a0618" />
      <rect x="14" y="30" width="14" height="6" rx="3" fill="#7adfff" fillOpacity="0.8" />
      <rect x="36" y="30" width="14" height="6" rx="3" fill="#7adfff" fillOpacity="0.8" />
      <path fill="none" stroke="#2ee6b8" strokeWidth="2" strokeLinecap="round" d="M27 47 L37 47" />
    </AlienHead>
  );
}

function AlienSilly({ className }: { className?: string }) {
  return (
    <AlienHead className={className}>
      <ellipse cx="21" cy="31" rx="8" ry="10" fill="#1a0618" />
      <ellipse cx="43" cy="33" rx="6" ry="7" fill="#1a0618" />
      <ellipse cx="22" cy="29" rx="2.5" ry="3" fill="#fff0fa" />
      <ellipse cx="44" cy="31" rx="2" ry="2.5" fill="#fff0fa" />
      <path fill="none" stroke="#2ee6b8" strokeWidth="2" strokeLinecap="round" d="M22 45 Q28 49 34 45" />
      <ellipse cx="38" cy="50" rx="5" ry="6" fill="#ff7ec8" />
      <ellipse cx="38" cy="49" rx="3" ry="4" fill="#ff94d2" />
    </AlienHead>
  );
}

function UfoSaucer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 56" className={className} aria-hidden>
      <ellipse cx="48" cy="34" rx="40" ry="14" fill="#7adfff" />
      <ellipse cx="48" cy="30" rx="40" ry="14" fill="#4dffd4" />
      <ellipse cx="48" cy="22" rx="18" ry="12" fill="#b8f7ff" fillOpacity="0.9" />
      <ellipse cx="48" cy="20" rx="14" ry="8" fill="#e8ffff" fillOpacity="0.75" />
      <circle cx="24" cy="34" r="3" fill="#ff7ec8" />
      <circle cx="36" cy="36" r="3" fill="#ff5eb8" />
      <circle cx="48" cy="37" r="3" fill="#ffc8eb" />
      <circle cx="60" cy="36" r="3" fill="#ff7ec8" />
      <circle cx="72" cy="34" r="3" fill="#ff5eb8" />
      <ellipse cx="48" cy="40" rx="34" ry="4" fill="#2ee6b8" fillOpacity="0.45" />
    </svg>
  );
}

function StarClassic({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        fill="#ff2d9b"
        d="M32 4 38 24 58 24 42 36 48 56 32 44 16 56 22 36 6 24 26 24Z"
      />
      <path
        fill="#ffc8eb"
        fillOpacity="0.75"
        d="M32 14 36 26 48 26 38 34 42 46 32 38 22 46 26 34 16 26 28 26Z"
      />
    </svg>
  );
}

function StarSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path fill="#ff5eb8" d="M32 6 36 26 56 26 40 38 46 58 32 46 18 58 24 38 8 26 28 26Z" />
      <circle cx="32" cy="32" r="6" fill="#fff0fa" />
      <circle cx="32" cy="32" r="3" fill="#ff2d9b" />
    </svg>
  );
}

function StarTiny({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path fill="#ff94d2" d="M20 4 23 15 34 15 25 22 28 33 20 26 12 33 15 22 6 15 17 15Z" />
    </svg>
  );
}

type DecorationVariant =
  | "heart-classic"
  | "heart-chrome"
  | "heart-pair"
  | "heart-tiny"
  | "heart-sparkle"
  | "flower-daisy"
  | "flower-burst"
  | "flower-dots"
  | "flower-soft"
  | "alien-happy"
  | "alien-wink"
  | "alien-surprised"
  | "alien-love"
  | "alien-cool"
  | "alien-silly"
  | "ufo"
  | "star-classic"
  | "star-sparkle"
  | "star-tiny";

type Decoration = {
  variant: DecorationVariant;
  top: string;
  left?: string;
  right?: string;
  size: string;
  rotate: string;
  opacity: number;
};

const DECORATIONS: Decoration[] = [
  { variant: "heart-tiny", top: "4vh", left: "2%", size: "2rem", rotate: "-10deg", opacity: 0.38 },
  { variant: "flower-dots", top: "6vh", right: "3%", size: "2.2rem", rotate: "14deg", opacity: 0.37 },
  { variant: "star-tiny", top: "9vh", right: "7%", size: "1.5rem", rotate: "-6deg", opacity: 0.38 },
  { variant: "heart-classic", top: "3vh", left: "10%", size: "3rem", rotate: "-14deg", opacity: 0.44 },
  { variant: "alien-happy", top: "8vh", left: "5%", size: "2.4rem", rotate: "12deg", opacity: 0.39 },
  { variant: "ufo", top: "7vh", left: "12%", size: "3.8rem", rotate: "-8deg", opacity: 0.43 },
  { variant: "flower-daisy", top: "5vh", right: "11%", size: "3.4rem", rotate: "12deg", opacity: 0.42 },
  { variant: "heart-chrome", top: "10vh", right: "4%", size: "2.2rem", rotate: "-16deg", opacity: 0.38 },
  { variant: "alien-wink", top: "12vh", right: "14%", size: "3rem", rotate: "10deg", opacity: 0.42 },
  { variant: "flower-soft", top: "13vh", left: "3%", size: "2.4rem", rotate: "8deg", opacity: 0.37 },
  { variant: "star-sparkle", top: "16vh", left: "8%", size: "1.6rem", rotate: "10deg", opacity: 0.37 },
  { variant: "heart-chrome", top: "9vh", left: "15%", size: "2.6rem", rotate: "8deg", opacity: 0.4 },
  { variant: "ufo", top: "15vh", right: "6%", size: "2.6rem", rotate: "-12deg", opacity: 0.39 },
  { variant: "flower-burst", top: "11vh", right: "16%", size: "2.8rem", rotate: "-10deg", opacity: 0.41 },
  { variant: "heart-tiny", top: "15vh", right: "10%", size: "1.8rem", rotate: "16deg", opacity: 0.38 },
  { variant: "alien-cool", top: "18vh", left: "2%", size: "2.6rem", rotate: "-8deg", opacity: 0.4 },
  { variant: "ufo", top: "19vh", left: "10%", size: "3.4rem", rotate: "12deg", opacity: 0.41 },
  { variant: "flower-soft", top: "17vh", left: "11%", size: "3.2rem", rotate: "-6deg", opacity: 0.43 },
  { variant: "heart-sparkle", top: "20vh", right: "2%", size: "2rem", rotate: "18deg", opacity: 0.37 },
  { variant: "flower-burst", top: "21vh", left: "6%", size: "2.3rem", rotate: "-14deg", opacity: 0.38 },
  { variant: "star-classic", top: "29vh", right: "8%", size: "1.6rem", rotate: "-12deg", opacity: 0.37 },
  { variant: "heart-pair", top: "22vh", left: "17%", size: "3.6rem", rotate: "10deg", opacity: 0.42 },
  { variant: "alien-silly", top: "23vh", right: "5%", size: "2.4rem", rotate: "6deg", opacity: 0.39 },
  { variant: "flower-dots", top: "24vh", right: "13%", size: "3rem", rotate: "-14deg", opacity: 0.4 },
  { variant: "heart-classic", top: "25vh", left: "4%", size: "2.2rem", rotate: "10deg", opacity: 0.38 },
  { variant: "alien-surprised", top: "26vh", left: "11%", size: "2.8rem", rotate: "-12deg", opacity: 0.41 },
  { variant: "flower-daisy", top: "27vh", right: "3%", size: "2.2rem", rotate: "-8deg", opacity: 0.37 },
  { variant: "heart-sparkle", top: "28vh", right: "18%", size: "2.8rem", rotate: "-12deg", opacity: 0.43 },
  { variant: "ufo", top: "30vh", left: "2%", size: "2.8rem", rotate: "14deg", opacity: 0.38 },
  { variant: "flower-daisy", top: "31vh", left: "12%", size: "2.4rem", rotate: "18deg", opacity: 0.39 },
  { variant: "alien-love", top: "32vh", left: "7%", size: "2.4rem", rotate: "-6deg", opacity: 0.4 },
  { variant: "star-tiny", top: "37vh", left: "4%", size: "1.5rem", rotate: "8deg", opacity: 0.36 },
  { variant: "ufo", top: "33vh", right: "10%", size: "3.6rem", rotate: "-14deg", opacity: 0.4 },
  { variant: "heart-classic", top: "35vh", right: "11%", size: "2.2rem", rotate: "14deg", opacity: 0.41 },
  { variant: "flower-soft", top: "36vh", right: "4%", size: "2.3rem", rotate: "12deg", opacity: 0.37 },
  { variant: "flower-burst", top: "38vh", left: "19%", size: "3.2rem", rotate: "-8deg", opacity: 0.42 },
  { variant: "heart-tiny", top: "39vh", left: "3%", size: "1.8rem", rotate: "-18deg", opacity: 0.36 },
  { variant: "alien-love", top: "40vh", left: "10%", size: "3rem", rotate: "6deg", opacity: 0.44 },
  { variant: "flower-dots", top: "42vh", left: "6%", size: "2.2rem", rotate: "16deg", opacity: 0.38 },
  { variant: "flower-soft", top: "45vh", right: "15%", size: "2.6rem", rotate: "12deg", opacity: 0.4 },
  { variant: "alien-wink", top: "46vh", right: "2%", size: "2.4rem", rotate: "-10deg", opacity: 0.39 },
  { variant: "alien-cool", top: "48vh", right: "11%", size: "3.2rem", rotate: "14deg", opacity: 0.42 },
  { variant: "heart-chrome", top: "47vh", left: "5%", size: "2rem", rotate: "8deg", opacity: 0.37 },
  { variant: "star-sparkle", top: "44vh", right: "5%", size: "1.5rem", rotate: "-14deg", opacity: 0.36 },
  { variant: "heart-tiny", top: "49vh", right: "20%", size: "1.6rem", rotate: "-18deg", opacity: 0.37 },
  { variant: "ufo", top: "50vh", right: "6%", size: "2.6rem", rotate: "10deg", opacity: 0.38 },
  { variant: "flower-dots", top: "52vh", left: "14%", size: "2.8rem", rotate: "10deg", opacity: 0.41 },
  { variant: "heart-pair", top: "51vh", left: "2%", size: "2.4rem", rotate: "-12deg", opacity: 0.39 },
  { variant: "ufo", top: "54vh", left: "11%", size: "3.2rem", rotate: "6deg", opacity: 0.41 },
  { variant: "flower-daisy", top: "55vh", right: "3%", size: "2.2rem", rotate: "-14deg", opacity: 0.37 },
  { variant: "star-classic", top: "58vh", left: "3%", size: "1.6rem", rotate: "16deg", opacity: 0.37 },
  { variant: "heart-pair", top: "56vh", right: "12%", size: "3.4rem", rotate: "-10deg", opacity: 0.43 },
  { variant: "alien-happy", top: "57vh", left: "4%", size: "2.4rem", rotate: "14deg", opacity: 0.38 },
  { variant: "flower-daisy", top: "59vh", left: "10%", size: "3.2rem", rotate: "16deg", opacity: 0.4 },
  { variant: "heart-sparkle", top: "60vh", right: "5%", size: "2rem", rotate: "8deg", opacity: 0.37 },
  { variant: "alien-silly", top: "61vh", left: "19%", size: "2.6rem", rotate: "-8deg", opacity: 0.4 },
  { variant: "flower-burst", top: "62vh", left: "7%", size: "2.3rem", rotate: "-16deg", opacity: 0.38 },
  { variant: "heart-sparkle", top: "63vh", left: "18%", size: "2.6rem", rotate: "-14deg", opacity: 0.42 },
  { variant: "alien-surprised", top: "64vh", left: "2%", size: "2.5rem", rotate: "6deg", opacity: 0.39 },
  { variant: "star-tiny", top: "72vh", right: "4%", size: "1.5rem", rotate: "-8deg", opacity: 0.36 },
  { variant: "flower-burst", top: "66vh", right: "17%", size: "2.8rem", rotate: "8deg", opacity: 0.39 },
  { variant: "heart-classic", top: "67vh", right: "4%", size: "2.2rem", rotate: "-12deg", opacity: 0.38 },
  { variant: "ufo", top: "68vh", right: "12%", size: "3.5rem", rotate: "10deg", opacity: 0.42 },
  { variant: "flower-soft", top: "69vh", left: "3%", size: "2.2rem", rotate: "10deg", opacity: 0.37 },
  { variant: "alien-happy", top: "70vh", right: "10%", size: "2.8rem", rotate: "12deg", opacity: 0.44 },
  { variant: "heart-tiny", top: "71vh", left: "6%", size: "1.8rem", rotate: "-8deg", opacity: 0.36 },
  { variant: "flower-soft", top: "73vh", left: "13%", size: "2.4rem", rotate: "-16deg", opacity: 0.41 },
  { variant: "ufo", top: "74vh", right: "2%", size: "2.8rem", rotate: "-14deg", opacity: 0.38 },
  { variant: "heart-chrome", top: "77vh", left: "20%", size: "2.2rem", rotate: "20deg", opacity: 0.38 },
  { variant: "alien-cool", top: "75vh", left: "4%", size: "2.4rem", rotate: "12deg", opacity: 0.39 },
  { variant: "alien-wink", top: "76vh", right: "18%", size: "2.8rem", rotate: "16deg", opacity: 0.41 },
  { variant: "flower-dots", top: "78vh", right: "6%", size: "2.2rem", rotate: "-10deg", opacity: 0.37 },
  { variant: "star-sparkle", top: "82vh", left: "7%", size: "1.5rem", rotate: "12deg", opacity: 0.35 },
  { variant: "flower-dots", top: "80vh", right: "14%", size: "3rem", rotate: "-8deg", opacity: 0.42 },
  { variant: "heart-pair", top: "81vh", left: "2%", size: "2.4rem", rotate: "8deg", opacity: 0.38 },
  { variant: "heart-tiny", top: "84vh", left: "11%", size: "1.8rem", rotate: "14deg", opacity: 0.36 },
  { variant: "flower-daisy", top: "85vh", left: "5%", size: "2.2rem", rotate: "-12deg", opacity: 0.37 },
  { variant: "ufo", top: "83vh", left: "10%", size: "3.4rem", rotate: "-12deg", opacity: 0.4 },
  { variant: "alien-silly", top: "86vh", right: "3%", size: "2.4rem", rotate: "14deg", opacity: 0.38 },
  { variant: "flower-daisy", top: "87vh", right: "19%", size: "3rem", rotate: "-12deg", opacity: 0.4 },
  { variant: "alien-surprised", top: "89vh", left: "13%", size: "3rem", rotate: "-6deg", opacity: 0.42 },
  { variant: "heart-sparkle", top: "88vh", right: "5%", size: "2rem", rotate: "-16deg", opacity: 0.37 },
  { variant: "heart-pair", top: "91vh", right: "11%", size: "3.2rem", rotate: "8deg", opacity: 0.43 },
  { variant: "flower-burst", top: "92vh", left: "3%", size: "2.2rem", rotate: "12deg", opacity: 0.37 },
  { variant: "flower-burst", top: "94vh", left: "16%", size: "2.6rem", rotate: "-10deg", opacity: 0.41 },
  { variant: "star-classic", top: "96vh", right: "9%", size: "1.6rem", rotate: "-10deg", opacity: 0.37 },
  { variant: "star-tiny", top: "14vh", left: "14%", size: "1.4rem", rotate: "-18deg", opacity: 0.35 },
  { variant: "star-classic", top: "34vh", right: "16%", size: "1.5rem", rotate: "20deg", opacity: 0.36 },
  { variant: "star-sparkle", top: "41vh", right: "8%", size: "1.4rem", rotate: "-6deg", opacity: 0.35 },
  { variant: "star-tiny", top: "53vh", right: "16%", size: "1.4rem", rotate: "14deg", opacity: 0.35 },
  { variant: "star-classic", top: "65vh", right: "8%", size: "1.5rem", rotate: "-16deg", opacity: 0.36 },
  { variant: "star-tiny", top: "79vh", left: "16%", size: "1.4rem", rotate: "8deg", opacity: 0.35 },
  { variant: "star-sparkle", top: "90vh", left: "8%", size: "1.5rem", rotate: "-12deg", opacity: 0.36 },
];

const ICONS: Record<DecorationVariant, ComponentType<{ className?: string }>> = {
  "heart-classic": HeartClassic,
  "heart-chrome": HeartChrome,
  "heart-pair": HeartPair,
  "heart-tiny": HeartTiny,
  "heart-sparkle": HeartSparkle,
  "flower-daisy": FlowerDaisy,
  "flower-burst": FlowerBurst,
  "flower-dots": FlowerDots,
  "flower-soft": FlowerSoft,
  "alien-happy": AlienHappy,
  "alien-wink": AlienWink,
  "alien-surprised": AlienSurprised,
  "alien-love": AlienLove,
  "alien-cool": AlienCool,
  "alien-silly": AlienSilly,
  ufo: UfoSaucer,
  "star-classic": StarClassic,
  "star-sparkle": StarSparkle,
  "star-tiny": StarTiny,
};

function DecorationItem({ item, index }: { item: Decoration; index: number }) {
  const Icon = ICONS[item.variant];
  const style: CSSProperties = {
    top: item.top,
    left: item.left,
    right: item.right,
    width: item.size,
    height: item.size,
    opacity: item.opacity,
    ["--decoration-rotate" as string]: item.rotate,
    animationDelay: `${(index * 0.31) % 4.2}s`,
    animationDuration: `${4.8 + (index % 4) * 0.35}s`,
  };

  return (
    <div className="dashboard-decoration" style={style}>
      <Icon className="h-full w-full" />
    </div>
  );
}

export function DashboardY2kDecorations() {
  return (
    <div className="dashboard-decorations" aria-hidden>
      {DECORATIONS.map((item, index) => (
        <DecorationItem key={`${item.variant}-${index}`} item={item} index={index} />
      ))}
    </div>
  );
}
