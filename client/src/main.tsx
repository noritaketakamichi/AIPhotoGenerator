import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";
import GalleryPage from "./pages/GalleryPage";
import ChargePage from "./pages/ChargePage";
import ChargeSuccessPage from "./pages/ChargeSuccessPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/gallery" component={GalleryPage} />
      <Route path="/charge" component={ChargePage} />
      <Route path="/charge/success" component={ChargeSuccessPage} />
      <Route>404 Page Not Found</Route>
    </Switch>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
