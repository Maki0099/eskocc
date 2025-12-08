import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, key } = useLocation();

  // useLayoutEffect ensures scroll happens before paint
  // Using key ensures scroll happens even when navigating to the same route
  useLayoutEffect(() => {
    // Force scroll to top immediately
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, key]);

  return null;
};

export default ScrollToTop;
