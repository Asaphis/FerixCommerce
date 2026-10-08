import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/ferix/forms";
import { AuthBenefitsPanel } from "@/components/ferix/auth-benefits";
import { FerixMark, Eyebrow } from "@/components/ferix/marks";
import { assetUrl } from "@/lib/api";
import { readSession } from "@/lib/session";

export default async function LoginPage() {
  if (await readSession()) redirect("/account");
  const heroImage = assetUrl("/media/banners/bnr_launch.jpg");

  return (
    <div className="mx-auto max-w-[1180px] px-3 py-5 sm:px-5 sm:py-8 lg:py-10">
      <div className="grid overflow-hidden rounded-[3px] rounded-tr-[18px] border border-line-warm bg-white shadow-[0_12px_36px_rgba(16,45,67,0.08)] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex items-center px-5 py-7 max-lg:order-2 sm:px-8 sm:py-9 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[410px]">
            <FerixMark className="h-9 w-9" />
            <Eyebrow className="mt-5 block">Welcome back</Eyebrow>
            <h1 className="mt-1.5 font-display text-[25px] font-bold leading-tight text-ink sm:text-[30px]">Sign in to Ferixas</h1>
            <p className="mt-1.5 max-w-[38ch] text-[12px] text-ink-soft">One account for your marketplace orders and saved items.</p>
            <div className="mt-6"><AuthForm mode="login" /></div>
            <p className="mt-5 text-center text-[11px] text-ink-soft">Shopping as a guest? <Link href="/browse" className="font-semibold text-ember hover:underline">Explore the marketplace</Link></p>
          </div>
        </section>

        <AuthBenefitsPanel
          imageUrl={heroImage}
          ctaHref="/register"
          ctaLabel="New to Ferixas? Create an account"
        />
      </div>
    </div>
  );
}
