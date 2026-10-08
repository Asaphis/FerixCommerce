/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Boxes, Building2, Receipt } from "lucide-react";
import { SignInForm } from "@/components/ops/sign-in";
import { OpsMark } from "@/components/ops/marks";
import { Eyebrow } from "@/components/ops/bits";
import { assetUrl } from "@/lib/api";
import { readSession } from "@/lib/session";

export default async function LoginPage() {
  if (await readSession()) redirect("/");
  const heroImage = assetUrl("/media/banners/bnr_official.jpg");

  return (
    <main className="grid min-h-screen bg-panel lg:grid-cols-[1.04fr_0.96fr]">
      <section className="relative isolate flex min-h-[220px] items-end overflow-hidden bg-[#132b3b] px-5 py-6 sm:min-h-[280px] sm:px-8 sm:py-8 lg:min-h-screen lg:px-12 lg:py-12">
        {heroImage ? <><img src={heroImage} alt="Ferixas marketplace operations" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45" /><div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#112b3b]/95 via-[#112b3b]/80 to-[#0e7284]/55" /></> : null}
        <div className="relative max-w-[530px]">
          <OpsMark className="h-10 w-10" />
          <Eyebrow className="mt-5 block text-signal">Platform operations</Eyebrow>
          <h1 className="mt-2 max-w-[17ch] font-display text-[26px] font-bold leading-tight text-white sm:text-[34px]">A safer marketplace for everyone.</h1>
          <p className="mt-2 max-w-[42ch] text-[12px] text-white/80">Monitor and manage Ferixas from one console.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-[450px]">
            {[{ title: "Merchants", Icon: Building2 }, { title: "Orders", Icon: Receipt }, { title: "Catalogue", Icon: Boxes }].map(({ title, Icon }) => <div key={title} className="flex min-h-10 items-center gap-1.5 rounded-[2px] border border-white/20 bg-white/10 px-2 text-[10px] font-semibold text-white"><Icon width={13} height={13} className="shrink-0 text-signal" />{title}</div>)}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-7 sm:px-8 sm:py-10 lg:px-10">
        <div className="w-full max-w-[430px] rounded-[3px] rounded-tr-[16px] border border-hairline bg-white p-5 shadow-[0_12px_36px_rgba(16,45,67,0.08)] sm:p-8">
          <OpsMark className="h-9 w-9" />
          <Eyebrow className="mt-5 block text-signal">Authorized operators only</Eyebrow>
          <h2 className="mt-1.5 font-display text-[23px] font-bold text-chalk sm:text-[27px]">Sign in to the console</h2>
          <p className="mt-1.5 text-[12px] text-chalk-dim">Use your assigned operator credentials.</p>
          <div className="mt-6"><SignInForm /></div>
          <div className="mt-5 flex items-start gap-2 border-t border-hairline pt-4"><AlertTriangle width={14} height={14} className="mt-0.5 shrink-0 text-amber" /><p className="text-[10px] leading-relaxed text-chalk-dim">Changes in this console can affect live merchants and marketplace operations.</p></div>
          <a href="https://shop.ferixas.com" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-signal">Open marketplace <ArrowRight width={13} height={13} /></a>
        </div>
      </section>
    </main>
  );
}
