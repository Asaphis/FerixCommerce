/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Heart, Package, MapPin } from "lucide-react";
import { AuthForm } from "@/components/ferix/forms";
import { FerixMark, Eyebrow } from "@/components/ferix/marks";
import { assetUrl } from "@/lib/api";
import { readSession } from "@/lib/session";

export default async function LoginPage() {
  if (await readSession()) redirect("/account");
  const heroImage = assetUrl("/media/banners/bnr_launch.jpg");

  return (
    <div className="mx-auto max-w-[1180px] px-3 py-5 sm:px-5 sm:py-8 lg:py-10">
      <div className="grid overflow-hidden rounded-[3px] rounded-tr-[18px] border border-line-warm bg-white shadow-[0_12px_36px_rgba(16,45,67,0.08)] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex items-center px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[410px]">
            <FerixMark className="h-9 w-9" />
            <Eyebrow className="mt-5 block">Welcome back</Eyebrow>
            <h1 className="mt-1.5 font-display text-[25px] font-bold leading-tight text-ink sm:text-[30px]">Sign in to Ferixas</h1>
            <p className="mt-1.5 max-w-[38ch] text-[12px] text-ink-soft">One account for your marketplace orders and saved items.</p>
            <div className="mt-6"><AuthForm mode="login" /></div>
            <p className="mt-5 text-center text-[11px] text-ink-soft">Shopping as a guest? <Link href="/browse" className="font-semibold text-ember hover:underline">Explore the marketplace</Link></p>
          </div>
        </section>

        <aside className="relative isolate flex min-h-[240px] flex-col justify-end overflow-hidden bg-[#f8e8df] p-5 sm:min-h-[290px] sm:p-7 lg:min-h-[510px] lg:p-9">
          {heroImage ? <><img src={heroImage} alt="Shopper carrying bags" className="absolute inset-0 -z-20 h-full w-full object-cover" /><div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/95 via-white/72 to-transparent lg:from-white/90 lg:via-white/45" /></> : null}
          <div className="relative max-w-[390px]">
            <Eyebrow className="text-ember">Your shopping, together</Eyebrow>
            <h2 className="mt-2 font-display text-[23px] font-bold leading-tight text-ink sm:text-[28px]">Shop more. Do more. In one account.</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {[{ title: "Track orders", Icon: Package }, { title: "Save favourites", Icon: Heart }, { title: "Manage addresses", Icon: MapPin }].map(({ title, Icon }) => <div key={title} className="flex min-h-9 items-center gap-2 rounded-[2px] border border-white/70 bg-white/85 px-2.5 text-[11px] font-semibold text-ink"><span className="grid h-6 w-6 place-items-center rounded-[2px] bg-[#fff0e9] text-ember"><Icon width={13} height={13} /></span>{title}</div>)}
            </div>
            <Link href="/register" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-ember">New to Ferixas? Create an account <ArrowRight width={13} height={13} /></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
