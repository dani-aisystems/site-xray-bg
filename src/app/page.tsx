"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: { id?: string; error?: string } = await res.json();
      if (!res.ok || !data.id) {
        setError(data.error ?? "Нещо се обърка. Опитайте отново.");
        setLoading(false);
        return;
      }
      router.push(`/r/${data.id}`);
    } catch {
      setError("Няма връзка със сървъра. Опитайте отново.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12">
      <p className="mb-3 text-sm font-medium uppercase tracking-wide text-emerald-800">
        Site X-ray
      </p>
      <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
        Проверете сайта си за 30 секунди
      </h1>
      <p className="mt-4 text-lg text-stone-600">
        Ще ви покажем кои 3 проблема карат клиентите да си тръгват и как да ги
        поправите — на ясен български, без технически думи.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3">
        <label htmlFor="url" className="text-sm font-medium">
          Адрес на сайта
        </label>
        <input
          id="url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="primer.bg"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-14 w-full rounded-xl border border-stone-300 bg-white px-4 text-lg outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30"
        />
        <button
          type="submit"
          disabled={loading || url.trim() === ""}
          className="h-14 rounded-xl bg-emerald-800 text-lg font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Проверяваме…" : "Провери сайта"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </form>

      <p className="mt-6 text-sm text-stone-500">
        Проверката е безплатна.
      </p>
    </main>
  );
}
