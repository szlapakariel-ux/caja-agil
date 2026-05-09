"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AppUser = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
};

type UserContextType = {
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  logout: () => {},
});

const STORAGE_KEY = "caja_agil_user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCurrentUserState(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const setCurrentUser = (user: AppUser | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const logout = () => setCurrentUser(null);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
