import type { Metadata } from "next";
import { VerifyEmailFlow } from "@/components/ferix/auth-flows";
import { Eyebrow, FerixMark } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Verify your email — Ferixas",
  description:
    "Confirm the email address on your Ferixas account so receipts, order updates and delivery notices reach you. Resend the verification email or change the address.",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const expired = state === "expired";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[440px] flex-col justify-center px-4 py-10">
      <div className="rounded-[3px] border border-line-warm bg-white p-5 lg:p-6">
        <FerixMark className="h-8 w-8" />
        <Eyebrow className="mt-5 block">Email verification</Eyebrow>
        <h1 className="mt-2 font-display text-[24px] font-semibold leading-tight text-ink">
          {expired ? "That verification link has expired" : "Confirm your email address"}
        </h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          {expired
            ? "Verification links are single use and time limited. Send yourself a new one and you can pick up exactly where you left off."
            : "We sent a verification link to the address you signed up with. Opening it proves the address is yours and unlocks order updates, receipts and reviews."}
        </p>
        <div className="mt-6">
          <VerifyEmailFlow expired={expired} />
        </div>
      </div>

      <p className="mt-5 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
        You can keep browsing while unverified
      </p>
    </div>
  );
}
