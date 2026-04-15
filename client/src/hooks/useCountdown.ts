import { useState, useEffect, useRef } from 'react';

export function useCountdown(totalSeconds: number) {
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const initialized = useRef(false);

  useEffect(() => {
    if (totalSeconds > 0) {
      setRemainingSeconds(totalSeconds);
      initialized.current = true;
    }
  }, [totalSeconds]);

  useEffect(() => {
    if (remainingSeconds <= 0 || !initialized.current) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds]);

  const minutes = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const seconds = secs.toString().padStart(2, '0');
  const isExpired = initialized.current && remainingSeconds <= 0;

  return { remainingSeconds, minutes, seconds, isExpired };
}
