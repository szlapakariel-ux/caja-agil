"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MovementCard } from "@/components/movements/movement-card";
import { Card, CardBody } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default function HistoryPage() {
  const { currentUser } = useUser();
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [movements, setMovements] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMovements = useCallback(async (date: string) => {
    setLoading(true);
    const res = await fetch(`/api/movements?date=${date}`);
    const data = await res.json();
    setMovements(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!currentUser) { router.replace("/"); return; }
    fetchMovements(selectedDate);
  }, [currentUser, fetchMovements, router, selectedDate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <Header title="Historial" />

      <main className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Buscar por fecha
          </label>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 text-base bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">
              {selectedDate === today ? "Hoy" : formatDate(selectedDate + "T12:00:00")}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {movements.length} movimiento(s)
            </span>
          </div>

          {loading ? (
            <Card><CardBody><p className="text-center text-gray-400 py-8 animate-pulse">Cargando...</p></CardBody></Card>
          ) : movements.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-center text-gray-400 py-8">
                  No hay movimientos para esta fecha
                </p>
              </CardBody>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {(movements as Parameters<typeof MovementCard>[0]["movement"][]).map((mov) => (
                <MovementCard
                  key={(mov as { id: string }).id}
                  movement={mov as Parameters<typeof MovementCard>[0]["movement"]}
                  onClick={() => router.push(`/movements/${(mov as { id: string }).id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
