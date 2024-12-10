import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface User {
  id: number;
  email: string;
  credit: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/user", {
        credentials: "include",
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (err) {
      setError("Failed to fetch user data");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (err) {
      console.error("Failed to refresh user data:", err);
    }
  };

  const login = () => {
    console.log('Initiating Google login...');
    const loginUrl = "http://localhost:3000/auth/google";
    console.log('Redirecting to:', loginUrl);
    window.location.href = loginUrl;
  };

  const logout = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include", // ← これを追加
      });
      if (response.ok) {
        setUser(null);
        setLocation("/");
      } else {
        setError("Failed to logout");
      }
    } catch (err) {
      setError("Failed to logout");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
