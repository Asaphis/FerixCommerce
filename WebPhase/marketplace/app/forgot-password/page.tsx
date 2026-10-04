import type { Metadata } from "next";
import { ForgotPasswordFlow } from "@/components/ferix/auth-flows";
import { Eyebrow, FerixMark } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Forgot password — Ferixas",
  description:
    "Request a password reset link for your Ferixas account. For your security we confirm every request the same way, whether or not an account exists.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[440px] flex-col justify-center px-4 py-10">
      <div className="rounded-[3px] border border-line-warm bg-white p-5 lg:p-6">
        <FerixMark className="h-8 w-8" />
        <Eyebrow className="mt-5 block">Account recovery</Eyebrow>
        <h1 className="mt-2 font-display text-[24px] font-semibold leading-tight text-ink">Forgot your password?</h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          Enter the email address on your account and we will send a link to choose a new password.
        </p>
        <div className="mt-6">
          <ForgotPasswordFlow />
        </div>
      </div>

      <p className="mt-5 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
        Links expire after 30 minutes · Support is on the help centre
      </p>
    </div>
  );
}
