import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ScrollToTop from "./components/ScrollToTop";
import { ScrollProgressBar } from "./components/layout/ScrollProgressBar";
import ProtectedRoute from "./components/ProtectedRoute";
import PageLoader from "./components/PageLoader";
import { ROUTES, ROUTE_PATTERNS } from "@/lib/routes";

// Lazy load all pages for code-splitting
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Account = lazy(() => import("./pages/Account"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Cafe = lazy(() => import("./pages/Cafe"));
const About = lazy(() => import("./pages/About"));
const Admin = lazy(() => import("./pages/Admin"));
const Statistics = lazy(() => import("./pages/Statistics"));
const Install = lazy(() => import("./pages/Install"));
const Documents = lazy(() => import("./pages/Documents"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="eskocc-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <ScrollProgressBar />
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path={ROUTES.HOME} element={<Index />} />
                <Route path={ROUTES.LOGIN} element={<Login />} />
                <Route path={ROUTES.REGISTER} element={<Register />} />
                <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
                <Route path={ROUTES.EVENTS} element={<Events />} />
                <Route path={ROUTE_PATTERNS.EVENT_DETAIL} element={<EventDetail />} />
                <Route path={ROUTES.GALLERY} element={<Gallery />} />
                <Route path={ROUTES.CAFE} element={<Cafe />} />
                <Route path={ROUTES.STATISTICS} element={<Statistics />} />
                <Route path={ROUTE_PATTERNS.MEMBER_PROFILE} element={<MemberProfile />} />
                <Route path={ROUTES.ABOUT} element={<About />} />
                <Route path={ROUTES.INSTALL} element={<Install />} />
                <Route path={ROUTES.DOCUMENTS} element={<Documents />} />
                <Route
                  path={ROUTES.DASHBOARD}
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.ACCOUNT}
                  element={
                    <ProtectedRoute>
                      <Account />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.ADMIN}
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
