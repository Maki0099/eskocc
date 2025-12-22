import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, key } = useLocation();

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Force immediate scroll to top
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      
      // Dispatch scroll event so parallax hooks recalculate
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('scroll'));
      });
    });
    
    // Safety scroll after async components (like Mapbox) initialize
    const timeout = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, 250);
    
    return () => clearTimeout(timeout);
  }, [pathname, key]);

  return null;
};

export default ScrollToTop;
