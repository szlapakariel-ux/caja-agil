"use client";

import { useUser } from "@/lib/user-context";
import { ThemeToggle } from "./theme-toggle";
import { ROLE_LABELS } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Header({ title }: { title?: string }) {
  const { currentUser, logout } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link href="/dashboard" className="flex-1 min-w-0">
          <span className="font-bold text-blue-600 dark:text-blue-400 text-lg truncate">
            {title ?? "Caja Simple"}
          </span>
        </Link>

        {currentUser && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Cambiar usuario"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="truncate max-w-[80px] sm:max-w-[100px]">{currentUser.name}</span>
              <span className="hidden sm:inline text-xs text-gray-400">
                ({ROLE_LABELS[currentUser.role]})
              </span>
            </button>
          </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
