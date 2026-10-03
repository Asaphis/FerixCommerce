import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Check, Eye } from "lucide-react";
import { SignInForm } from "@/components/ops/sign-in";
import { OpsMark } from "@/components/ops/marks";
import { Eyebrow, Panel, Pill } from "@/components/ops/bits";
import { readSession } from "@/lib/session";

export default async function LoginPage() {
  if (await readSession()) redirect("/");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[380px]">
          <OpsMark className="h-9 w-9" />
          <Eyebrow className="mt-6 block">Platform operations</Eyebrow>
          <h1 className="mt-2 font-display text-[26px] font-semibold text-chalk">Ferixas console</h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-chalk-dim">
            The control room for the whole platform: every merchant, every customer, every order, and the
            settings that govern how the marketplace behaves.
          </p>
          <div className="mt-7">
            <SignInForm />
          </div>
          <div className="mt-6 rounded-[2px] border border-hairline bg-panel p-4">
            <Eyebrow>Demo operator</Eyebrow>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-chalk-dim">
              Sign in with <span className="font-mono text-chalk">info@ferixas.com</span> /{" "}
              <span className="font-mono text-chalk">Ferixas123</span> to see the live platform.
            </p>
            <p className="mt-2 font-mono text-[10.5px] text-chalk-dim/80">
              Other operator addresses: admin@ferixas.com, ops@ferixas.com
            </p>
          </div>
        </div>
      </div>

      <aside className="hidden flex-col justify-center border-l border-hairline bg-panel px-10 py-14 lg:flex">
        <Eyebrow className="text-signal">Two systems in your hands</Eyebrow>
        <h2 className="mt-3 max-w-[24ch] font-display text-[26px] font-semibold leading-tight text-chalk">
          Shoppers and merchants, from one console
        </h2>
        <ul className="mt-7 space-y-4">
          {[
            { title: "Merchants", body: "Approve, suspend, set commission, choose plans and switch marketplace access." },
            { title: "Customers", body: "Every registered shopper with their orders, spend and saved items." },
            { title: "Orders", body: "Platform-wide fulfilment, payment state and commission per order." },
            { title: "Analytics", body: "GMV, commission and growth split by merchant, channel and department." },
            { title: "Settings", body: "Platform defaults that bind every merchant and every checkout." },
          ].map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <Check width={15} height={15} className="mt-[3px] shrink-0 text-signal" />
              <span>
                <span className="block text-[13.5px] font-medium text-chalk">{item.title}</span>
                <span className="block text-[12.5px] text-chalk-dim">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>

        <Panel className="mt-9 max-w-[400px] bg-panel-2">
          <div className="flex items-center gap-2">
            <AlertTriangle width={14} height={14} className="text-amber" />
            <Eyebrow>Acting as the platform</Eyebrow>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-chalk-dim">
            Anything you change here is live. A suspended merchant stops selling at once; commission changes apply
            to the next order, not to orders already placed.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Pill tone="signal">Live data</Pill>
            <Pill tone="neutral">No simulated records</Pill>
          </div>
        </Panel>

        <div className="mt-8 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-chalk-dim">
          <Link href="/" className="transition-colors hover:text-signal">
            Open console
          </Link>
          <span className="flex items-center gap-1.5">
            <Eye width={11} height={11} /> Read-only previews available
          </span>
        </div>
      </aside>
    </div>
  );
}
