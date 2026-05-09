"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type AppUser = {
  id: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
};

type UserContextType = {
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null, persist?: boolean) => void;
  forgetPersistedUser: () => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  forgetPersistedUser: () => {},
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

  const setCurrentUser = (user: AppUser | null, persist = false) => {
    setCurrentUserState(user);
    if (user && persist) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else if (!user) {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Si persist=false y user != null: solo estado en memoria, sin localStorage
  };

  const forgetPersistedUser = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const logout = () => {
    setCurrentUserState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, forgetPersistedUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
