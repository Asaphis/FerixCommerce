/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, Package, ShoppingCart } from "lucide-react";
import { SignInForm } from "@/components/studio/forms";
import { FerixasMark } from "@/components/studio/marks";
import { Eyebrow } from "@/components/studio/bits";
import { apiImageUrl } from "@/lib/api";
import { readSession } from "@/lib/session";

export default async function LoginPage() {
  if (await readSession()) redirect("/");
  const heroImage = apiImageUrl("/media/merchants/abc-electronics.jpg");

  return (
    <main className="grid min-h-screen bg-panel lg:grid-cols-[1.04fr_0.96fr]">
      <section className="relative isolate flex min-h-[220px] items-end overflow-hidden bg-[#152c3c] px-5 py-6 sm:min-h-[280px] sm:px-8 sm:py-8 lg:min-h-screen lg:px-12 lg:py-12">
        {heroImage ? <><img src={heroImage} alt="Ferixas seller workspace" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-55" /><div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#102a3a]/95 via-[#102a3a]/70 to-[#e4572e]/40" /></> : null}
        <div className="relative max-w-[520px]">
          <FerixasMark className="h-10 w-10" />
          <Eyebrow className="mt-5 block text-lime">Seller centre</Eyebrow>
          <h1 className="mt-2 max-w-[18ch] font-display text-[26px] font-bold leading-tight text-white sm:text-[34px]">Grow your store on Ferixas.</h1>
          <p className="mt-2 max-w-[42ch] text-[12px] text-white/80">One workspace for products, orders and stock.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-[430px]">
            {[{ title: "Products", Icon: Package }, { title: "Orders", Icon: ShoppingCart }, { title: "Inventory", Icon: Boxes }].map(({ title, Icon }) => <div key={title} className="flex min-h-10 items-center gap-1.5 rounded-[2px] border border-white/20 bg-white/10 px-2 text-[10px] font-semibold text-white"><Icon width={13} height={13} className="shrink-0 text-lime" />{title}</div>)}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-7 sm:px-8 sm:py-10 lg:px-10">
        <div className="w-full max-w-[430px] rounded-[3px] rounded-tr-[16px] border border-hairline bg-white p-5 shadow-[0_12px_36px_rgba(16,45,67,0.08)] sm:p-8">
          <Eyebrow className="block text-signal">Merchant workspace</Eyebrow>
          <h2 className="mt-1.5 font-display text-[23px] font-bold text-chalk sm:text-[27px]">Sign in to your store</h2>
          <p className="mt-1.5 text-[12px] text-chalk-dim">Use the account assigned to your store.</p>
          <div className="mt-6"><SignInForm /></div>
          <div className="mt-5 border-t border-hairline pt-4"><Link href="/" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-signal">Visit the marketplace <ArrowRight width={13} height={13} /></Link><p className="mt-2 text-[10px] text-chalk-dim">Need seller access? Contact Ferixas support.</p></div>
        </div>
      </section>
    </main>
  );
}
