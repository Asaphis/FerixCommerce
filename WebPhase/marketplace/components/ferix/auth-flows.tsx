"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Check, CheckCircle2, MailCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Interactive halves of the recovery / verification flows.
 *
 * These screens sit in front of no backend yet, so each flow simulates the round
 * trip locally: idle → submitting (button disabled with a pending label) → success.
 * The copy stays honest about what has and has not actually happened.
 *
 * Styling mirrors components/ferix/forms.tsx: same `field` / `label` strings,
 * sharp 2px controls, 3px cards, no rounded-lg.
 */
const field =
  "h-10 w-full rounded-[2px] border border-line-warm bg-white px-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-ink";
const label = "font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft";

type Status = "idle" | "submitting" | "success";

function Field({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={label}>{title}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1.5 block text-[12px] leading-relaxed text-ink-soft">{hint}</span> : null}
    </label>
  );
}

function PrimaryButton({
  children,
  pending,
  pendingLabel,
  type = "submit",
  className,
}: {
  children: React.ReactNode;
  pending?: boolean;
  pendingLabel?: string;
  type?: "submit" | "button";
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={pending}
      aria-busy={pending ? true : undefined}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[2px] bg-ink px-4 py-2.5 text-[13px] font-semibold text-bone transition-colors duration-200 hover:bg-ember disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

function Notice({ tone, children }: { tone: "info" | "warn" | "success" | "error"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    info: "border-line-warm bg-bone-soft text-ink-soft",
    warn: "border-sand/50 bg-sand/12 text-[#8a6a1f]",
    success: "border-pine/40 bg-pine/8 text-pine",
    error: "border-ember/40 bg-ember/8 text-ember",
  };
  const Icon = tone === "success" ? Check : tone === "warn" ? ShieldAlert : tone === "error" ? AlertCircle : MailCheck;
  return (
    <p className={cn("flex items-start gap-2 rounded-[2px] border px-3 py-2.5 text-[12.5px] leading-relaxed", tones[tone])}>
      <Icon width={14} height={14} className="mt-[2px] shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** One short, quiet line so the simulated round trip is never mistaken for a real one. */
function DemoNote({ children }: { children: React.ReactNode }) {
  return <p className={cn(label, "text-ink-soft/80")}>{children}</p>;
}

function LinkAction({ href, children, strong = false }: { href: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-[12.5px]",
        strong
          ? "font-semibold text-ink underline decoration-ember decoration-2 underline-offset-4 hover:text-ember"
          : "text-ink-soft underline decoration-2 underline-offset-4 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Forgot password                                                     */
/* ------------------------------------------------------------------ */

export function ForgotPasswordFlow() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status !== "submitting") return;
    const timer = window.setTimeout(() => setStatus("success"), 900);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (status === "success") {
    return (
      <div className="grid grid-cols-1 gap-4">
        <span className="grid h-10 w-10 place-items-center rounded-[2px] bg-pine/10 text-pine">
          <CheckCircle2 width={20} height={20} strokeWidth={1.6} />
        </span>
        <div>
          <p className="font-display text-[17px] font-semibold text-ink">Check your email</p>
          {/* Neutral by design: the same message shows for known and unknown addresses. */}
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            If an account exists for <span className="font-mono text-ink">{email.trim() || "that address"}</span>, we
            have sent a link to choose a new password. It stays valid for 30 minutes.
          </p>
        </div>
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Nothing arrived? Check the spam or promotions folder, then request another link in a few minutes.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-warm pt-4">
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="cursor-pointer text-[12.5px] text-ink-soft underline decoration-2 underline-offset-4 hover:text-ink"
          >
            Use a different address
          </button>
          <LinkAction href="/login" strong>
            Back to sign in
            <ArrowRight width={14} height={14} />
          </LinkAction>
        </div>
        <DemoNote>Demo build — no email is actually sent</DemoNote>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <form
        className="grid grid-cols-1 gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!email.trim()) return;
          setStatus("submitting");
        }}
      >
        <Field title="Email address">
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={field}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>
        <Notice tone="info">
          We send the same confirmation whether or not an account exists, so this page can never be used to check who
          shops here.
        </Notice>
        <PrimaryButton pending={status === "submitting"} pendingLabel="Sending the link" className="w-full">
          Send reset link
        </PrimaryButton>
      </form>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-warm pt-4">
        <LinkAction href="/login">Back to sign in</LinkAction>
        <LinkAction href="/register">Create an account</LinkAction>
      </div>
      <DemoNote>Demo build — no email is actually sent</DemoNote>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reset password                                                      */
/* ------------------------------------------------------------------ */

const passwordRules: { key: string; text: string; test: (value: string) => boolean }[] = [
  { key: "length", text: "At least 8 characters", test: (value) => value.length >= 8 },
  { key: "case", text: "An uppercase and a lowercase letter", test: (value) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { key: "number", text: "One number (0–9)", test: (value) => /\d/.test(value) },
];

export function ResetPasswordFlow() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "submitting") return;
    const timer = window.setTimeout(() => setStatus("success"), 900);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (status === "success") {
    return (
      <div className="grid grid-cols-1 gap-4">
        <span className="grid h-10 w-10 place-items-center rounded-[2px] bg-pine/10 text-pine">
          <CheckCircle2 width={20} height={20} strokeWidth={1.6} />
        </span>
        <div>
          <p className="font-display text-[17px] font-semibold text-ink">Your password has been updated</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            Sign in with your new password. For safety, other sessions on this account have been signed out.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-2 rounded-[2px] bg-ink px-4 py-2.5 text-[13px] font-semibold text-bone transition-colors duration-200 hover:bg-ember"
        >
          Continue to sign in
          <ArrowRight width={14} height={14} />
        </Link>
        <div className="border-t border-line-warm pt-4">
          <LinkAction href="/help">Trouble signing in?</LinkAction>
        </div>
        <DemoNote>Demo build — the new password is not stored</DemoNote>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <form
        className="grid grid-cols-1 gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const unmet = passwordRules.find((rule) => !rule.test(password));
          if (unmet) {
            setError(unmet.text === "At least 8 characters" ? "Your password needs at least 8 characters." : `Your password still needs: ${unmet.text.toLowerCase()}.`);
            return;
          }
          if (password !== confirm) {
            setError("Both passwords must match.");
            return;
          }
          setError(null);
          setStatus("submitting");
        }}
      >
        <Field title="New password">
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={field}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </Field>
        <Field title="Confirm new password">
          <input
            type="password"
            name="confirm"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={field}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </Field>

        <div className="rounded-[3px] border border-line-warm bg-bone-soft/60 p-3.5">
          <p className={label}>Your password needs</p>
          <ul className="mt-2.5 grid gap-2">
            {passwordRules.map((rule) => {
              const met = rule.test(password);
              return (
                <li key={rule.key} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
                  <span
                    className={cn(
                      "mt-[1px] grid h-4 w-4 shrink-0 place-items-center rounded-[2px] border",
                      met ? "border-pine bg-pine text-white" : "border-line-warm bg-white text-transparent",
                    )}
                    aria-hidden="true"
                  >
                    <Check width={11} height={11} strokeWidth={3} />
                  </span>
                  <span className={met ? "text-ink" : "text-ink-soft"}>
                    {rule.text}
                    <span className="sr-only">{met ? " — met" : " — not met yet"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}

        <PrimaryButton pending={status === "submitting"} pendingLabel="Updating your password" className="w-full">
          Update password
        </PrimaryButton>
      </form>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-warm pt-4">
        <LinkAction href="/login">Back to sign in</LinkAction>
        <LinkAction href="/forgot-password">Request a new link</LinkAction>
      </div>
      <DemoNote>Demo build — the new password is not stored</DemoNote>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Verify email                                                        */
/* ------------------------------------------------------------------ */

export function VerifyEmailFlow({ expired = false }: { expired?: boolean }) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status !== "submitting") return;
    const timer = window.setTimeout(() => setStatus("success"), 900);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <div className="grid grid-cols-1 gap-4">
      {expired ? (
        <Notice tone="warn">
          This verification link has expired. Nothing is wrong with your account — request a fresh link and open the
          newest one.
        </Notice>
      ) : (
        <Notice tone="info">
          We are waiting for you to open the link we sent. It stays valid for 24 hours.
        </Notice>
      )}

      <ul className="grid grid-cols-1 gap-2.5">
        {[
          "Verifying confirms the address we send receipts, order updates and delivery notices to.",
          "If you requested more than one link, only the most recent one works.",
        ].map((line) => (
          <li key={line} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-soft">
            <Check width={14} height={14} className="mt-[2px] shrink-0 text-ember" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <form
        className="grid grid-cols-1 gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setStatus("submitting");
        }}
      >
        <PrimaryButton pending={status === "submitting"} pendingLabel="Resending the email" className="w-full">
          Resend verification email
        </PrimaryButton>
      </form>

      {status === "success" ? (
        <Notice tone="success">
          {expired
            ? "A new verification link is on its way. Open the newest email — older links stop working."
            : "Sent again. Give it a minute to arrive, and check the spam folder before requesting another."}
        </Notice>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-warm pt-4">
        <LinkAction href="/account/profile">Change email address</LinkAction>
        <LinkAction href="/login" strong>
          Continue
          <ArrowRight width={14} height={14} />
        </LinkAction>
      </div>

      <DemoNote>Demo build — no email is actually sent</DemoNote>
    </div>
  );
}
