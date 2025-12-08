import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, key } = useLocation();

  // useLayoutEffect ensures scroll happens before paint
  useLayoutEffect(() => {
    // Force immediate scroll to top using multiple methods for cross-browser compatibility
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Dispatch a scroll event so parallax hooks recalculate their position
    window.dispatchEvent(new Event('scroll'));
  }, [pathname, key]);

  return null;
};

export default ScrollToTop;
