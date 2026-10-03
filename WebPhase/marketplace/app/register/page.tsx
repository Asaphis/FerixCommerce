import { redirect } from "next/navigation";
import { ClipboardList, Heart, MapPin, Star } from "lucide-react";
import { AuthForm } from "@/components/ferix/forms";
import { Eyebrow, FerixMark } from "@/components/ferix/marks";
import { readSession } from "@/lib/session";

export default async function RegisterPage() {
  if (await readSession()) redirect("/account");

  return (
    <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 lg:grid-cols-[1fr_1fr]">
      <div className="max-w-[420px]">
        <FerixMark className="h-8 w-8" />
        <Eyebrow className="mt-6 block">New account</Eyebrow>
        <h1 className="mt-2 font-display text-[28px] font-semibold text-ink">Create your Ferixas account</h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          One account works across the marketplace and every merchant store. It takes a moment.
        </p>
        <div className="mt-7">
          <AuthForm mode="register" />
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          By creating an account you agree to the buyer terms and the returns policy.
        </p>
      </div>

      <aside className="rounded-[3px] border border-line-warm bg-white p-8">
        <Eyebrow>What you get</Eyebrow>
        <h2 className="mt-3 font-display text-[24px] font-semibold leading-tight text-ink">
          Everything you buy on Ferixas, in one place
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            { Icon: ClipboardList, title: "Orders", body: "Track each seller's parcel from one list." },
            { Icon: Heart, title: "Saved items", body: "Keep products for later and add them in a tap." },
            { Icon: MapPin, title: "Addresses", body: "Save delivery addresses with labels you choose." },
            { Icon: Star, title: "Reviews", body: "Rate what you bought and edit it whenever." },
          ].map((item) => (
            <div key={item.title} className="rounded-[3px] border border-line-warm p-4">
              <item.Icon width={19} height={19} strokeWidth={1.5} className="text-ember" />
              <p className="mt-3 font-display text-[14px] font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 rounded-[2px] border border-line-warm bg-bone-soft px-3 py-2.5 text-[12.5px] text-ink-soft">
          Everything here is a real account on the store's backend — registering, signing out and signing back in all
          work exactly as they will in production.
        </p>
      </aside>
    </div>
  );
}
