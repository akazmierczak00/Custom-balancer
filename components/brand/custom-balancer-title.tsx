"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

function Y2kDiamondLogo({ className }: { className?: string }) {
  return (
    <h1 className={cn("brand-title-logo", className)} aria-label="Custom Balancer">
      <Image
        src="/brand/custom-balancer-y2k.png"
        alt=""
        width={1024}
        height={216}
        className="brand-title-image"
        priority
      />
    </h1>
  );
}

export function CustomBalancerTitle({ className }: { className?: string }) {
  const { theme, ready } = useTheme();

  if (!ready || theme !== "y2k") {
    return <h1 className={cn("text-2xl font-bold", className)}>Custom Balancer</h1>;
  }

  return <Y2kDiamondLogo className={className} />;
}
