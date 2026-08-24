"use client";

import { useCallback, useEffect, useState } from "react";

export function useCountdown() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const start = useCallback((duration: number) => {
    setSecondsLeft(duration);
  }, []);

  const reset = useCallback(() => {
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => (value ?? 0) - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  return {
    secondsLeft: secondsLeft ?? 0,
    isRunning: secondsLeft !== null,
    expired: secondsLeft === 0,
    start,
    reset,
  };
}
