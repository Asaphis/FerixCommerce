import { redirect } from "next/navigation";
import { AuthForm } from "@/components/ferix/forms";
import { AuthBenefitsPanel } from "@/components/ferix/auth-benefits";
import { Eyebrow, FerixMark } from "@/components/ferix/marks";
import { assetUrl } from "@/lib/api";
import { readSession } from "@/lib/session";

export default async function RegisterPage() {
  if (await readSession()) redirect("/account");
  const heroImage = assetUrl("/media/banners/bnr_launch.jpg");

  return (
    <div className="mx-auto grid max-w-[1240px] gap-5 px-4 py-6 sm:gap-8 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:py-14">
      <div className="max-w-[420px] max-lg:order-2">
        <FerixMark className="h-8 w-8" />
        <Eyebrow className="mt-6 block">New account</Eyebrow>
        <h1 className="mt-2 font-display text-[28px] font-semibold text-ink">Create your Ferixas account</h1>
        <div className="mt-7">
          <AuthForm mode="register" />
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          By creating an account you agree to the buyer terms and the returns policy.
        </p>
      </div>

      <AuthBenefitsPanel
        imageUrl={heroImage}
        ctaHref="/login"
        ctaLabel="Already have an account? Sign in"
        className="rounded-[3px] rounded-tr-[18px] border border-line-warm shadow-[0_12px_36px_rgba(16,45,67,0.08)]"
      />
    </div>
  );
}
