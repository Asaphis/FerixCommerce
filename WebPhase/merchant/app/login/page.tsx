import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { SignInForm } from "@/components/studio/forms";
import { FerixasMark } from "@/components/studio/marks";
import { Eyebrow, Panel } from "@/components/studio/bits";
import { readSession } from "@/lib/session";

export default async function LoginPage() {
  if (await readSession()) redirect("/");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[380px]">
          <FerixasMark className="h-9 w-9" />
          <Eyebrow className="mt-6 block">Seller workspace</Eyebrow>
          <h1 className="mt-2 font-display text-[26px] font-semibold text-chalk">Sign in to your store</h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-chalk-dim">
            Your catalogue, inventory, orders and payouts in one workspace. The same products feed your
            own storefront and the Ferixas marketplace.
          </p>
          <div className="mt-7">
            <SignInForm />
          </div>
          <div className="mt-6 rounded-[2px] border border-hairline bg-panel p-4">
            <Eyebrow>Demo store</Eyebrow>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-chalk-dim">
              Sign in as ABC Electronics to see a store with a live catalogue and 48 orders:{" "}
              <span className="font-mono text-chalk">owner@abc-electronics.ferixas.com</span> /{" "}
              <span className="font-mono text-chalk">Ferixas123</span>
            </p>
            <p className="mt-2 font-mono text-[10.5px] text-chalk-dim/80">
              Any seller works: owner@&lt;store&gt;.ferixas.com — try aurasound, nova-fashion, sahel-supply.
            </p>
          </div>
        </div>
      </div>

      <aside className="hidden flex-col justify-center border-l border-hairline bg-panel px-10 py-14 lg:flex">
        <Eyebrow className="text-lime">One catalogue, every channel</Eyebrow>
        <h2 className="mt-3 max-w-[22ch] font-display text-[26px] font-semibold leading-tight text-chalk">
          Run the shop, not the spreadsheets
        </h2>
        <ul className="mt-7 space-y-4">
          {[
            { title: "Products", body: "Create a product once and choose where it sells: your store, the marketplace, or both." },
            { title: "Inventory", body: "Stock, reserved units and low-stock warnings per SKU." },
            { title: "Orders", body: "Marketplace and store orders in one queue, with fulfilment and tracking." },
            { title: "Money", body: "Revenue, commission and payouts, per period." },
          ].map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <Check width={15} height={15} className="mt-[3px] shrink-0 text-lime" />
              <span>
                <span className="block text-[13.5px] font-medium text-chalk">{item.title}</span>
                <span className="block text-[12.5px] text-chalk-dim">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <Panel className="mt-9 max-w-[380px] bg-panel-2">
          <Eyebrow>Looking for the shop?</Eyebrow>
          <p className="mt-2 text-[12.5px] leading-relaxed text-chalk-dim">
            Shoppers use the marketplace and your storefront, not this workspace.
          </p>
          <Link href="/" className="mt-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-lime">
            Browse the marketplace <ArrowRight width={12} height={12} />
          </Link>
        </Panel>
      </aside>
    </div>
  );
}
