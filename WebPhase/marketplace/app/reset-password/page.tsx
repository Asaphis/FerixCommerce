import type { Metadata } from "next";
import { ResetPasswordFlow } from "@/components/ferix/auth-flows";
import { Eyebrow, FerixMark } from "@/components/ferix/marks";

export const metadata: Metadata = {
  title: "Set a new password — Ferixas",
  description:
    "Choose a new password for your Ferixas account and sign back in with it across the marketplace.",
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[440px] flex-col justify-center px-4 py-10">
      <div className="rounded-[3px] border border-line-warm bg-white p-5 lg:p-6">
        <FerixMark className="h-8 w-8" />
        <Eyebrow className="mt-5 block">Reset password</Eyebrow>
        <h1 className="mt-2 font-display text-[24px] font-semibold leading-tight text-ink">Choose a new password</h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          Pick something you have not used here before. You will use it the next time you sign in.
        </p>
        <div className="mt-6">
          <ResetPasswordFlow />
        </div>
      </div>

      <p className="mt-5 text-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
        Opened from an email link? Keep this tab open until it is saved
      </p>
    </div>
  );
}
