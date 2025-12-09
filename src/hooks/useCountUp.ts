import { useState, useEffect, useRef } from "react";

interface UseCountUpOptions {
  duration?: number;
  start?: number;
}

export const useCountUp = (
  end: number | null,
  { duration = 2000, start = 0 }: UseCountUpOptions = {}
) => {
  const [count, setCount] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (end === null || end === 0) {
      setCount(0);
      return;
    }

    setIsAnimating(true);
    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing function for smooth deceleration
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      setCount(Math.floor(start + (end - start) * easeOutQuart));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration, start]);

  return { count, isAnimating };
};
