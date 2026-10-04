"use client";

import { useState } from "react";
import { AlertCircle, Check, Send } from "lucide-react";
import { cn } from "@/lib/utils";

/** Same control styling as components/ferix/forms.tsx, kept local so this file stays self-contained. */
const field =
  "h-10 w-full rounded-[2px] border border-line-warm bg-white px-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-ink";
const label = "font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft";

const TOPICS = [
  "An order I placed",
  "Payment or refund",
  "Delivery problem",
  "A return or exchange",
  "My account",
  "Selling on Ferixas",
  "Something else",
];

type Values = {
  name: string;
  email: string;
  topic: string;
  order: string;
  message: string;
};

type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { name: "", email: "", topic: TOPICS[0], order: "", message: "" };

export function ContactForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  function update(key: keyof Values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Errors = {};
    if (values.name.trim().length < 2) next.name = "Tell us who we should reply to.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim()))
      next.email = "Enter an email address we can answer.";
    if (values.message.trim().length < 20) next.message = "Add a little more detail — 20 characters or more.";

    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  }

  function reset() {
    setValues(EMPTY);
    setErrors({});
    setSent(false);
  }

  if (sent) {
    const firstName = values.name.trim().split(/\s+/)[0];
    return (
      <div className="rounded-[3px] border border-pine/40 bg-pine/8 p-5">
        <p className="flex items-center gap-2 font-display text-[15.5px] font-semibold text-ink">
          <Check width={16} height={16} className="text-pine" />
          Thanks, {firstName}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Nothing was actually sent. This build of Ferixas has no message endpoint, so your details stayed in the
          browser and were discarded when the form closed.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          On the live marketplace this submission would open a ticket with the {values.topic.toLowerCase()} desk, quote
          your order number if you gave one, and get a first reply within one working day. We would write back to{" "}
          <span className="font-mono text-[12px] text-ink">{values.email.trim()}</span>.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-ink/25 px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink hover:bg-ink hover:text-bone"
        >
          Write another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>Your name</span>
          <div className="mt-1.5">
            <input
              name="name"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              className={cn(field, errors.name && "border-ember")}
              placeholder="Ada Bello"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
            />
          </div>
          {errors.name ? <span className="mt-1.5 block text-[12px] text-ember">{errors.name}</span> : null}
        </label>

        <label className="block">
          <span className={label}>Email address</span>
          <div className="mt-1.5">
            <input
              name="email"
              type="email"
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              className={cn(field, errors.email && "border-ember")}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
          </div>
          {errors.email ? <span className="mt-1.5 block text-[12px] text-ember">{errors.email}</span> : null}
        </label>

        <label className="block">
          <span className={label}>What is it about</span>
          <div className="mt-1.5">
            <select
              name="topic"
              value={values.topic}
              onChange={(event) => update("topic", event.target.value)}
              className={field}
            >
              {TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block">
          <span className={label}>Order number (optional)</span>
          <div className="mt-1.5">
            <input
              name="order"
              value={values.order}
              onChange={(event) => update("order", event.target.value)}
              className={cn(field, "font-mono")}
              placeholder="FX-2418-0092"
            />
          </div>
        </label>
      </div>

      <label className="block">
        <span className={label}>Message</span>
        <div className="mt-1.5">
          <textarea
            name="message"
            value={values.message}
            onChange={(event) => update("message", event.target.value)}
            className={cn(field, "h-[132px] resize-y py-2 leading-relaxed", errors.message && "border-ember")}
            placeholder="Tell us what happened, which seller was involved and what you would like us to do."
            aria-invalid={Boolean(errors.message)}
          />
        </div>
        {errors.message ? <span className="mt-1.5 block text-[12px] text-ember">{errors.message}</span> : null}
      </label>

      {Object.keys(errors).length ? (
        <p className="flex items-start gap-2 rounded-[2px] border border-ember/40 bg-ember/8 px-3 py-2.5 text-[12.5px] text-ember">
          <AlertCircle width={14} height={14} className="mt-[1px] shrink-0" />
          Check the highlighted fields and send again.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] bg-ink px-4 py-2.5 text-[13px] font-semibold text-bone transition-colors duration-200 hover:bg-ember"
        >
          <Send width={14} height={14} />
          Send message
        </button>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft sm:text-right">
          Demo form — validated in the browser, nothing is sent
        </p>
      </div>
    </form>
  );
}
