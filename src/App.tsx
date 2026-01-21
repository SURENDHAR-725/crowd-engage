import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Loader2 } from "lucide-react";

// Lazy load pages for better code splitting
const Index = lazy(() => import("./pages/Index"));
const JoinSession = lazy(() => import("./pages/JoinSession"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateSession = lazy(() => import("./pages/CreateSession"));
const LiveSession = lazy(() => import("./pages/LiveSession"));
const BuzzerSession = lazy(() => import("./pages/BuzzerSession"));
const MockTest = lazy(() => import("./pages/MockTest"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/join" element={<JoinSession />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/create" element={<CreateSession />} />
                  <Route path="/mocktest" element={<MockTest />} />
                  <Route path="/session/:code" element={<LiveSession />} />
                  <Route path="/buzzer/:code" element={<BuzzerSession />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
