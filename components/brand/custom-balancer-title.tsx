"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

function Y2kDiamondLogo({ className }: { className?: string }) {
  return (
    <div className={cn("brand-title-banner", className)}>
      <div className="brand-title-dots" aria-hidden />
      <h1 className="brand-title-logo" aria-label="Custom Balancer">
        <Image
          src="/brand/custom-balancer-y2k.png"
          alt=""
          width={1024}
          height={216}
          className="brand-title-image"
          priority
        />
      </h1>
    </div>
  );
}

export function CustomBalancerTitle({ className }: { className?: string }) {
  const { theme, ready } = useTheme();

  if (!ready || theme !== "y2k") {
    return <h1 className={cn("text-2xl font-bold", className)}>Custom Balancer</h1>;
  }

  return <Y2kDiamondLogo className={className} />;
}
