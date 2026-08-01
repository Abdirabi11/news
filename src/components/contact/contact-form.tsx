"use client";

import { useState } from "react";
import { Send, Check, AlertCircle } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

const FIELD =
  "w-full rounded-xl bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted transition focus:outline-none focus:ring-4 focus:ring-sage-soft";
const LABEL = "block text-xs font-semibold text-ink-soft";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const disabled = status === "submitting";

  async function handleSubmit() {
    if (!name || !email || !message) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      // Replace with your real endpoint:
      // await fetch("/api/contact", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ name, email, subject, message }),
      // });
      await new Promise((r) => setTimeout(r, 700)); // simulated latency
      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl bg-surface px-8 py-16 text-center shadow-soft">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-soft">
          <Check className="h-7 w-7 text-sage" aria-hidden />
        </span>
        <h3 className="mt-5 text-xl font-bold tracking-tight text-ink">
          Message sent
        </h3>
        <p className="mt-2 max-w-sm text-sm text-ink-soft">
          Thank you for reaching out. A member of our newsroom will review
          your message and respond if a reply is needed.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 rounded-full bg-canvas px-5 py-2 text-sm font-medium text-ink transition hover:bg-wood"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-surface px-6 py-7 shadow-soft sm:px-8 sm:py-9">
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="cf-name" className={LABEL}>
              Name
            </label>
            <input
              id="cf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled}
              placeholder="Your full name"
              className={FIELD}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cf-email" className={LABEL}>
              Email
            </label>
            <input
              id="cf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled}
              placeholder="you@example.com"
              className={FIELD}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cf-subject" className={LABEL}>
            Subject
          </label>
          <input
            id="cf-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={disabled}
            placeholder="What is this about?"
            className={FIELD}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cf-message" className={LABEL}>
            Message
          </label>
          <textarea
            id="cf-message"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={disabled}
            placeholder="Share your story, tip, or inquiry…"
            className={`${FIELD} resize-y`}
          />
        </div>

        {status === "error" && (
          <p className="flex items-center gap-2 text-sm text-terracotta">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            Please add your name, a valid email, and a message before sending.
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-hover disabled:opacity-60"
        >
          <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          {disabled ? "Sending…" : "Send message"}
        </button>
      </div>
    </div>
  );
}

