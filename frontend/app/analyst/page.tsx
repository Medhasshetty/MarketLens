"use client";

import clsx from "clsx";
import { ArrowUp, Check, ChevronDown, Copy, Database, RotateCcw, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SpecChart } from "@/components/charts";
import { api } from "@/lib/api";
import type { ChatReply } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string; reply?: ChatReply; error?: boolean };

const SUGGESTIONS = [
  "Which markets are driving growth and which are slowing down?",
  "Why is conversion lower in some markets, and what should we fix first?",
  "Which new country should we expand into next, and why?",
  "How does customer retention compare across regions?",
  "Which acquisition channel brings the most valuable customers?",
  "Is Europe's recent revenue dip seasonal or a real decline?",
];

export default function AnalystPage() {
  return (
    <Suspense>
      <Analyst />
    </Suspense>
  );
}

function Analyst() {
  const params = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const q = params.get("q");
    if (q && !asked.current) {
      asked.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...msgs.filter((m) => !m.error), { role: "user" as const, content }];
    setMsgs((m) => [...m, { role: "user", content }]);
    setInput("");
    setBusy(true);
    try {
      const reply = await api.chat(history.map(({ role, content }) => ({ role, content })));
      setMsgs((m) => [...m, { role: "assistant", content: reply.answer, reply }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  const empty = msgs.length === 0;

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem-5rem)] flex-col lg:min-h-dvh">
      <div className="flex items-center justify-between px-4 pt-5 sm:px-6 lg:px-10 lg:pt-10">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-4xl">AI analyst</h1>
          <p className="mt-1 text-sm text-muted sm:text-base">Ask anything about your markets. Every number is pulled from the data, with the queries shown.</p>
        </div>
        {!empty && (
          <button onClick={() => setMsgs([])} className="hidden items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-ink sm:flex">
            <RotateCcw size={14} /> New conversation
          </button>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-40 pt-6 sm:px-6 lg:pb-8">
        {empty ? (
          <div className="pt-4 sm:pt-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber/20 text-amber">
              <Sparkles size={22} />
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold">What do you want to understand?</h2>
            <p className="mt-1 text-sm text-muted">Start with one of these, or type your own question.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-2xl border border-line bg-surface p-4 text-left text-sm leading-snug hover:border-amber">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {msgs.map((m, i) => (m.role === "user" ? <UserBubble key={i} text={m.content} /> : <Answer key={i} msg={m} />))}
            {busy && <Thinking />}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="fixed inset-x-0 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur lg:sticky lg:bottom-0 lg:px-10"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-line bg-surface p-2 pl-4 focus-within:border-amber">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about your markets…"
            aria-label="Your question"
            className="max-h-32 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="Send question"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-bg disabled:opacity-30"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-3 text-sm leading-relaxed text-bg">{text}</p>
    </div>
  );
}

function Answer({ msg }: { msg: Msg }) {
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const r = msg.reply;
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/20 text-amber">
        <Sparkles size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={clsx("prose-analyst text-[15px]", msg.error && "text-rust")}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>

        {r?.chart && r.chart.data?.length > 0 && (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
            <SpecChart spec={r.chart} />
          </div>
        )}

        {r && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(msg.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-ink"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy answer"}
            </button>
            {r.queries.length > 0 && (
              <button
                onClick={() => setShowSql((s) => !s)}
                aria-expanded={showSql}
                className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-ink"
              >
                <Database size={13} /> {r.queries.length} {r.queries.length === 1 ? "query" : "queries"} used
                <ChevronDown size={13} className={clsx("transition-transform", showSql && "rotate-180")} />
              </button>
            )}
            {r.mode === "demo" && <span className="rounded-full bg-amber/15 px-2.5 py-1 text-[11px] text-amber">Demo mode</span>}
          </div>
        )}

        {showSql && r && (
          <div className="mt-3 space-y-2">
            {r.queries.map((q, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-line">
                <p className="border-b border-line bg-raised px-3 py-2 text-xs text-muted">
                  {q.purpose}
                  {q.rows != null && ` (${q.rows} rows)`}
                </p>
                <pre className="scroll-x bg-surface p-3 font-mono text-xs leading-relaxed">{q.sql}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber/20 text-amber">
        <Sparkles size={15} className="animate-pulse" />
      </div>
      Querying the data and checking the numbers…
    </div>
  );
}
