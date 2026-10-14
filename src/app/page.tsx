"use client";

import { useEffect, useRef, useState } from "react";

type Marketplace = "wildberries" | "ozon";

const MARKETPLACES: Record<
  Marketplace,
  { label: string; badge: string; accent: string; ring: string }
> = {
  wildberries: {
    label: "Wildberries",
    badge: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",
    accent: "from-fuchsia-600 to-purple-600",
    ring: "focus:ring-fuchsia-500/30 focus:border-fuchsia-500",
  },
  ozon: {
    label: "Ozon",
    badge: "bg-blue-100 text-blue-700 ring-blue-200",
    accent: "from-blue-600 to-sky-500",
    ring: "focus:ring-blue-500/30 focus:border-blue-500",
  },
};

const parseKeywords = (raw: string) =>
  raw
    .split(/[,;\n]/)
    .map((k) => k.trim())
    .filter(Boolean);

type StreamEvent = { type: "text"; text: string } | { type: "error"; message: string } | { type: "done" };

export default function Home() {
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [marketplace, setMarketplace] = useState<Marketplace>("wildberries");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<number | undefined>(undefined);

  const mp = MARKETPLACES[marketplace];
  const keywordList = parseKeywords(keywords);
  const canSubmit = name.trim().length > 0 && !isGenerating;

  useEffect(
    () => () => {
      abortRef.current?.abort();
      clearTimeout(copyTimer.current);
    },
    [],
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setOutput("");
    setError("");
    setCopied(false);
    setIsGenerating(true);

    try {
      let res: Response;
      try {
        res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), keywords, marketplace }),
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) throw err;
        throw new Error("Не удалось связаться с сервером. Проверьте подключение к интернету и попробуйте снова.");
      }

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : `Системная ошибка сервера (код ${res.status}). Попробуйте позже.`,
        );
      }

      // Ответ — NDJSON-поток: по одному JSON-событию на строку
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let finished = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line) as StreamEvent;
          } catch {
            throw new Error("Системная ошибка: сервер вернул некорректный ответ. Попробуйте ещё раз.");
          }
          if (event.type === "text") setOutput((prev) => prev + event.text);
          else if (event.type === "error") {
            setError(event.message);
            finished = true;
          } else if (event.type === "done") finished = true;
        }
      }
      if (!finished) {
        throw new Error("Соединение с сервером прервалось до завершения генерации. Попробуйте ещё раз.");
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Системная ошибка: не удалось сгенерировать текст. Попробуйте ещё раз.",
      );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsGenerating(false);
      }
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const inputBase =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Декоративный фон */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-fuchsia-200/50 via-violet-200/40 to-blue-200/50 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Шапка */}
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/30">
              <SparklesIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CardGen</h1>
              <p className="text-sm text-slate-500">Генератор карточек для маркетплейсов</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700 ring-1 ring-fuchsia-200">
              Wildberries
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
              Ozon
            </span>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-5">
          {/* Форма */}
          <form
            onSubmit={handleGenerate}
            className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-xl shadow-slate-200/50 backdrop-blur sm:p-8 lg:col-span-2"
          >
            <h2 className="text-lg font-semibold">Параметры товара</h2>
            <p className="mt-1 text-sm text-slate-500">Заполните поля — мы подготовим продающий текст.</p>

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Название товара <span className="text-rose-500">*</span>
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Беспроводные наушники X200"
                  className={`${inputBase} ${mp.ring}`}
                />
              </div>

              <div>
                <label htmlFor="keywords" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Ключевые слова
                </label>
                <textarea
                  id="keywords"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  rows={3}
                  placeholder="шумоподавление, bluetooth 5.3, долгий заряд"
                  className={`${inputBase} ${mp.ring} resize-none`}
                />
                <div className="mt-2 flex min-h-6 flex-wrap gap-1.5">
                  {keywordList.length ? (
                    keywordList.map((k, i) => (
                      <span
                        key={`${k}-${i}`}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      >
                        #{k}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Разделяйте запятой или с новой строки</span>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="marketplace" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Маркетплейс
                </label>
                <div className="relative">
                  <select
                    id="marketplace"
                    value={marketplace}
                    onChange={(e) => setMarketplace(e.target.value as Marketplace)}
                    className={`${inputBase} ${mp.ring} cursor-pointer appearance-none pr-10`}
                  >
                    <option value="wildberries">Wildberries</option>
                    <option value="ozon">Ozon</option>
                  </select>
                  <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${mp.accent} px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100`}
            >
              {isGenerating ? (
                <>
                  <Spinner /> Генерируем…
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" /> Сгенерировать карточку
                </>
              )}
            </button>
            {isGenerating && (
              <button
                type="button"
                onClick={handleStop}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Остановить
              </button>
            )}
          </form>

          {/* Результат */}
          <section className="flex min-h-[520px] flex-col rounded-3xl border border-slate-200/80 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur lg:col-span-3">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Результат</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${mp.badge}`}>
                  {mp.label}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!output || isGenerating}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4 text-emerald-500" /> Скопировано
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4" /> Копировать
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 px-6 py-6 sm:px-8">
              {error && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
              {isGenerating && !output ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="h-4 w-5/6 rounded bg-slate-200" />
                  <div className="h-4 w-full rounded bg-slate-200" />
                  <div className="h-4 w-4/6 rounded bg-slate-200" />
                  <div className="h-4 w-2/3 rounded bg-slate-200" />
                </div>
              ) : output ? (
                <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-slate-700">
                  {output}
                  {isGenerating && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-violet-500 align-middle" />
                  )}
                </pre>
              ) : error ? null : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100">
                    <DocIcon className="h-8 w-8 text-violet-500" />
                  </div>
                  <p className="font-medium text-slate-700">Здесь появится описание товара</p>
                  <p className="mt-1 max-w-xs text-sm text-slate-400">
                    Заполните форму слева и нажмите «Сгенерировать карточку»
                  </p>
                </div>
              )}
            </div>

            {output && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-400 sm:px-8">
                <span>{output.length} символов</span>
                <span>Сгенерировано нейросетью · проверьте текст перед публикацией</span>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

/* ——— Иконки ——— */

type IconProps = { className?: string };

function SparklesIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

function ChevronIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CopyIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function DocIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
