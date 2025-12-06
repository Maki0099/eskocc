import { useEffect, useState, useRef, useCallback } from "react";

interface UseParallaxOptions {
  speed?: number;
  direction?: "up" | "down";
}

export const useParallax = ({
  speed = 0.3,
  direction = "up",
}: UseParallaxOptions = {}) => {
  const [offset, setOffset] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const ticking = useRef(false);

  const updatePosition = useCallback(() => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    // Calculate how far through the viewport the element is
    const elementCenter = rect.top + rect.height / 2;
    const viewportCenter = windowHeight / 2;
    const distanceFromCenter = elementCenter - viewportCenter;
    
    // Calculate parallax offset
    const multiplier = direction === "up" ? -1 : 1;
    const newOffset = distanceFromCenter * speed * multiplier;
    
    setOffset(newOffset);
    ticking.current = false;
  }, [speed, direction]);

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(updatePosition);
      ticking.current = true;
    }
  }, [updatePosition]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial calculation
    updatePosition();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll, updatePosition]);

  return { ref, offset };
};
