"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/format";

type User = { id: string; name: string; role: string; avatarColor?: string | null; avatarIcon?: string | null };

const AVATAR_COLORS: Record<string, { bg: string; text: string }> = {
  white:  { bg: "bg-gray-100 dark:bg-gray-700",       text: "text-gray-500 dark:text-gray-300" },
  green:  { bg: "bg-green-100 dark:bg-green-900/40",  text: "text-green-700 dark:text-green-400" },
  brown:  { bg: "bg-amber-100 dark:bg-amber-900/40",  text: "text-amber-800 dark:text-amber-400" },
};
const DEFAULT_AVATAR = { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" };

function AvatarContent({ user }: { user: User }) {
  const colors = (user.avatarColor && AVATAR_COLORS[user.avatarColor]) ?? DEFAULT_AVATAR;
  const isMale = user.avatarIcon === "male";
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${colors.bg} ${colors.text}`}>
      {isMale ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
      ) : (
        user.name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default function LoginPage() {
  const { currentUser, setCurrentUser, forgetPersistedUser } = useUser();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [rememberUser, setRememberUser] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [businessName, setBusinessName] = useState("Caja Simple MVP");

  useEffect(() => {
    if (currentUser) {
      router.replace("/dashboard");
      return;
    }
    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/config").then((r) => r.json()),
    ]).then(([usersData, configData]) => {
      setUsers(usersData);
      setBusinessName(configData.appDisplayName ?? "Caja Simple MVP");
      setLoading(false);
    });
  }, [currentUser, router]);

  const handleSelectUser = (user: User) => {
    if (user.role === "ADMIN") {
      setSelectedUser(user);
      setPin("");
      setPinError("");
    } else {
      setCurrentUser(
        { id: user.id, name: user.name, role: user.role as "ADMIN" | "EMPLOYEE" },
        rememberUser
      );
      router.push("/dashboard");
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedUser) return;
    setVerifying(true);
    setPinError("");
    try {
      const res = await fetch("/api/users/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, pin }),
      });
      const data = await res.json();
      if (data.ok) {
        setCurrentUser(
          { id: selectedUser.id, name: selectedUser.name, role: selectedUser.role as "ADMIN" | "EMPLOYEE" },
          rememberUser
        );
        router.push("/dashboard");
      } else {
        setPinError("PIN incorrecto. Intentá de nuevo.");
        setPin("");
      }
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-400 text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900 flex flex-col">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{businessName}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">¿Quién está trabajando?</p>
          </div>

          {!selectedUser ? (
            <div className="flex flex-col gap-3">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all text-left flex items-center gap-4"
                >
                  <AvatarContent user={user} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {ROLE_LABELS[user.role] ?? user.role}
                      {user.role === "ADMIN" && (
                        <span className="ml-2 text-xs text-blue-500">🔐 Requiere PIN</span>
                      )}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}

              {/* Checkbox recordar usuario */}
              <label className="flex items-center gap-3 px-2 py-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberUser}
                  onChange={(e) => {
                    setRememberUser(e.target.checked);
                    if (!e.target.checked) forgetPersistedUser();
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Recordar este usuario en este dispositivo
                </span>
              </label>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <div className="text-center mb-6">
                <div className="mx-auto mb-3 w-14 h-14 [&>div]:w-14 [&>div]:h-14 [&>div]:rounded-2xl [&>div]:text-xl">
                  <AvatarContent user={selectedUser} />
                </div>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{selectedUser.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ingresá tu PIN para continuar</p>
              </div>

              <div className="flex flex-col gap-4">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="● ● ● ●"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                  autoFocus
                  className="w-full text-center text-3xl tracking-[0.5em] rounded-xl border px-4 py-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {pinError && (
                  <p className="text-center text-sm text-red-500 font-medium">{pinError}</p>
                )}

                {/* Recordar también en el flujo de PIN */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberUser}
                    onChange={(e) => {
                      setRememberUser(e.target.checked);
                      if (!e.target.checked) forgetPersistedUser();
                    }}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Recordar en este dispositivo
                  </span>
                </label>

                <Button
                  onClick={handlePinSubmit}
                  loading={verifying}
                  disabled={pin.length === 0}
                  size="lg"
                  className="w-full"
                >
                  Ingresar
                </Button>

                <button
                  onClick={() => { setSelectedUser(null); setPin(""); setPinError(""); }}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-center"
                >
                  ← Volver a seleccionar usuario
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
