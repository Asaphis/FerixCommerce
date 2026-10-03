import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { AuthForm } from "@/components/ferix/forms";
import { FerixMark, Eyebrow } from "@/components/ferix/marks";
import { readSession } from "@/lib/session";

export default async function LoginPage() {
  if (await readSession()) redirect("/account");

  return (
    <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 lg:grid-cols-[1fr_1fr]">
      <div className="max-w-[420px]">
        <FerixMark className="h-8 w-8" />
        <Eyebrow className="mt-6 block">Welcome back</Eyebrow>
        <h1 className="mt-2 font-display text-[28px] font-semibold text-ink">Sign in to your account</h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
          Your orders, saved items and addresses follow you across every store on the platform.
        </p>
        <div className="mt-7">
          <AuthForm mode="login" />
        </div>
        <div className="mt-6 rounded-[3px] border border-line-warm bg-white p-4">
          <Eyebrow>Just looking around?</Eyebrow>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
            Sign in with the demo shopper to see an account with past orders and saved items:{" "}
            <span className="font-mono text-ink">demo@ferixas.com</span> /{" "}
            <span className="font-mono text-ink">Ferixas123</span>
          </p>
        </div>
      </div>

      <aside className="rounded-[3px] border border-hairline bg-void p-8">
        <Eyebrow className="text-lime">One account, every store</Eyebrow>
        <h2 className="mt-3 font-display text-[24px] font-semibold leading-tight text-chalk">
          Seven merchants, one cart and one checkout
        </h2>
        <ul className="mt-6 space-y-4">
          {[
            { title: "Order history in one place", body: "Whatever seller you bought from, the order sits in your account." },
            { title: "Saved items that stay saved", body: "Keep something for later and it is still there next week." },
            { title: "Addresses ready at checkout", body: "Add an address once and it is offered on every order." },
            { title: "Reviews you control", body: "Edit or delete anything you have written." },
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
        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">
          Not a customer?{" "}
          <Link href="/register" className="text-lime underline decoration-2 underline-offset-4">
            Create an account
          </Link>
        </p>
      </aside>
    </div>
  );
}
