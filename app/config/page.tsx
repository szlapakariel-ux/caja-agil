"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PAYMENT_METHOD_LABELS } from "@/lib/format";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type Config = {
  id: string;
  businessName: string;
  appDisplayName: string;
  currency: string;
  activePaymentMethods: string[];
  themePreference: string;
};

type User = { id: string; name: string; role: string };

const ALL_PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "MERCADO_PAGO", "OTHER"];

export default function ConfigPage() {
  const { currentUser } = useUser();
  const router = useRouter();

  const [config, setConfig] = useState<Config | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [appDisplayName, setAppDisplayName] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    const [configRes, usersRes] = await Promise.all([
      fetch("/api/config"),
      fetch("/api/users"),
    ]);
    const [configData, usersData] = await Promise.all([configRes.json(), usersRes.json()]);
    setConfig(configData);
    setBusinessName(configData.businessName);
    setAppDisplayName(configData.appDisplayName);
    setPaymentMethods(configData.activePaymentMethods ?? []);
    setUsers(usersData);
    const names: Record<string, string> = {};
    usersData.forEach((u: User) => { names[u.id] = u.name; });
    setUserNames(names);
  }, []);

  useEffect(() => {
    if (!currentUser) { router.replace("/"); return; }
    if (currentUser.role !== "ADMIN") { router.replace("/dashboard"); return; }
    fetchData();
  }, [currentUser, fetchData, router]);

  const handleSaveConfig = async () => {
    if (!currentUser) return;
    setSaving(true);
    setSavedMsg("");
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        businessName,
        appDisplayName,
        activePaymentMethods: paymentMethods,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedMsg("Configuración guardada");
      setTimeout(() => setSavedMsg(""), 3000);
    }
  };

  const handleSaveUsers = async () => {
    if (!currentUser) return;
    setSaving(true);
    const res = await fetch("/api/config/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        users: users.map((u) => ({ id: u.id, name: userNames[u.id] ?? u.name })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedMsg("Usuarios actualizados");
      setTimeout(() => setSavedMsg(""), 3000);
      fetchData();
    }
  };

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <Header title="Configuración" />

      <main className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
        {savedMsg && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">✓ {savedMsg}</p>
          </div>
        )}

        {/* Negocio */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-900 dark:text-gray-100">Datos del negocio</h2></CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Nombre del negocio</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Nombre de la app</label>
              <input type="text" value={appDisplayName} onChange={(e) => setAppDisplayName(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <Button variant="primary" loading={saving} onClick={handleSaveConfig}>Guardar</Button>
          </CardBody>
        </Card>

        {/* Medios de pago */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-900 dark:text-gray-100">Medios de pago activos</h2></CardHeader>
          <CardBody className="flex flex-col gap-3">
            {ALL_PAYMENT_METHODS.map((method) => (
              <label key={method} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={paymentMethods.includes(method)} onChange={() => togglePaymentMethod(method)}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                <span className="text-base text-gray-900 dark:text-gray-100">{PAYMENT_METHOD_LABELS[method]}</span>
              </label>
            ))}
            <Button variant="primary" loading={saving} onClick={handleSaveConfig}>Guardar</Button>
          </CardBody>
        </Card>

        {/* Usuarios */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-900 dark:text-gray-100">Usuarios</h2></CardHeader>
          <CardBody className="flex flex-col gap-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-base flex-shrink-0">
                  {(userNames[user.id] ?? user.name).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <input type="text" value={userNames[user.id] ?? user.name} onChange={(e) => setUserNames((prev) => ({ ...prev, [user.id]: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-xs text-gray-400">
                    {user.role === "ADMIN" ? "Dueña / Admin" : "Empleado"}
                    {user.role === "ADMIN" && " · PIN: ****"}
                  </span>
                </div>
              </div>
            ))}
            <Button variant="primary" loading={saving} onClick={handleSaveUsers}>Guardar nombres</Button>
          </CardBody>
        </Card>

        {/* Tema */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-900 dark:text-gray-100">Apariencia</h2></CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Tema claro / oscuro</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">La preferencia se guarda en el navegador</p>
              </div>
              <ThemeToggle />
            </div>
          </CardBody>
        </Card>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            ⚠️ <strong>Nota sobre el PIN:</strong> El PIN demo (1234) es solo para demostración y no reemplaza un sistema de autenticación real. No usar en producción con datos reales.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
