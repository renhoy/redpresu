"use client";

import { useRouter } from "next/navigation";

interface ContactMessagesStatsProps {
  stats: {
    total: number;
    nuevo: number;
    leido: number;
    respondido: number;
  };
  currentFilter?: "nuevo" | "leido" | "respondido";
}

export function ContactMessagesStats({
  stats,
  currentFilter,
}: ContactMessagesStatsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div
        className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all ${
          !currentFilter
            ? "border-lime-500 shadow-md"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => router.push("/contact-messages")}
      >
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-sm text-gray-600">Total Mensajes</div>
      </div>

      <div
        className={`bg-blue-50 rounded-lg border-2 p-4 cursor-pointer transition-all ${
          currentFilter === "nuevo"
            ? "border-lime-500 shadow-md"
            : "border-blue-200 hover:border-blue-300"
        }`}
        onClick={() => router.push("/contact-messages?status=nuevo")}
      >
        <div className="text-2xl font-bold text-blue-600">{stats.nuevo}</div>
        <div className="text-sm text-blue-800">Nuevos</div>
      </div>

      <div
        className={`bg-yellow-50 rounded-lg border-2 p-4 cursor-pointer transition-all ${
          currentFilter === "leido"
            ? "border-lime-500 shadow-md"
            : "border-yellow-200 hover:border-yellow-300"
        }`}
        onClick={() => router.push("/contact-messages?status=leido")}
      >
        <div className="text-2xl font-bold text-yellow-600">{stats.leido}</div>
        <div className="text-sm text-yellow-800">Leídos</div>
      </div>

      <div
        className={`bg-green-50 rounded-lg border-2 p-4 cursor-pointer transition-all ${
          currentFilter === "respondido"
            ? "border-lime-500 shadow-md"
            : "border-green-200 hover:border-green-300"
        }`}
        onClick={() => router.push("/contact-messages?status=respondido")}
      >
        <div className="text-2xl font-bold text-green-600">{stats.respondido}</div>
        <div className="text-sm text-green-800">Respondidos</div>
      </div>
    </div>
  );
}
