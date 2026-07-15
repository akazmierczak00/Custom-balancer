"use client";

import { useEffect } from "react";
import type { Unsubscribe } from "firebase/firestore";
import { usePageVisible } from "@/hooks/use-page-visible";

export function useVisibleSubscription(
  factory: () => Unsubscribe | undefined,
  deps: readonly unknown[]
) {
  const visible = usePageVisible();

  useEffect(() => {
    if (!visible) return;
    return factory();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- factory captures subscription setup
  }, [visible, ...deps]);
}
