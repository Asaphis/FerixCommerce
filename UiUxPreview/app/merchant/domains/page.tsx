"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useFerixas } from "@/lib/store";
import { dateLong } from "@/lib/format";
import { StudioShell } from "@/components/studio/shell";
import {
  Field,
  Panel,
  PanelHead,
  Pill,
  StudioButton,
  TableWrap,
  Td,
  Th,
  inputClass,
} from "@/components/studio/bits";

const DNS_RECORDS = [
  { type: "A", name: "@", value: "76.76.21.21", ttl: "Auto" },
  { type: "CNAME", name: "www", value: "cname.ferixas.com", ttl: "Auto" },
  { type: "TXT", name: "_ferixas-verify", value: "fx-verify=8c41d0b2", ttl: "Auto" },
];

export default function DomainsPage() {
  const { merchant, merchantId, updateMerchant } = useFerixas();
  const [domains, setDomains] = useState<
    { id: string; name: string; status: "connected" | "pending" | "failed"; added: string }[]
  >(
    merchant.customDomain
      ? [{ id: "d1", name: merchant.customDomain, status: "connected", added: "2024-04-18" }]
      : [],
  );
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState<string | null>(null);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.info(value);
    }
  };

  const add = () => {
    const clean = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!clean || !clean.includes(".")) {
      toast.error("Enter a domain like myshop.com");
      return;
    }
    if (domains.some((d) => d.name === clean)) {
      toast.error("That domain is already on the list");
      return;
    }
    setDomains([
      ...domains,
      { id: `d${domains.length + 1}`, name: clean, status: "pending", added: new Date().toISOString() },
    ]);
    setInput("");
    toast.success(`${clean} added \u2014 point the DNS records below at Ferixas`);
  };

  const verify = (id: string, name: string) => {
    setChecking(id);
    setTimeout(() => {
      setChecking(null);
      setDomains((prev) => prev.map((d) => (d.id === id ? { ...d, status: "connected" } : d)));
      updateMerchant(merchantId, { customDomain: name });
      toast.success(`${name} verified and connected with SSL`);
    }, 1400);
  };

  const primary = domains.find((d) => d.status === "connected");

  return (
    <StudioShell
      title="Domains"
      subtitle={`${domains.length} custom domain${domains.length === 1 ? "" : "s"} \u00b7 platform address always available`}
      actions={
        <Link href={`/store/${merchant.slug}`}>
          <StudioButton>
            <ExternalLink width={14} height={14} /> Open store
          </StudioButton>
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Platform address", value: merchant.domain, hint: "Always on, never needs DNS" },
          {
            label: "Primary domain",
            value: primary?.name ?? "None connected",
            hint: primary ? "Serving your storefront" : "Customers use the platform address",
          },
          { label: "SSL", value: primary ? "Valid" : "Not required", hint: "Renews automatically" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[3px] border border-hairline bg-panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">{stat.label}</p>
            <p className="mt-3 truncate font-mono text-[14px] text-chalk">{stat.value}</p>
            <p className="mt-1 text-[12px] text-chalk-dim">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Panel flush>
          <div className="p-5 pb-4">
            <PanelHead title="Your domains" hint="One primary domain serves the storefront" />
          </div>
          <div className="px-5 pb-5">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Domain</Th>
                  <Th>Status</Th>
                  <Th>Added</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>
                    <span className="flex items-center gap-2 font-mono text-[12.5px] text-chalk">
                      <Globe width={13} height={13} className="text-chalk-dim" />
                      {merchant.domain}
                    </span>
                  </Td>
                  <Td>
                    <Pill tone="success">
                      <Check width={11} height={11} /> Platform
                    </Pill>
                  </Td>
                  <Td className="font-mono text-[11.5px] text-chalk-dim">{merchant.since.slice(0, 10)}</Td>
                  <Td align="right">
                    <span className="font-mono text-[10.5px] text-chalk-dim">Included with your plan</span>
                  </Td>
                </tr>
                {domains.map((domain) => (
                  <tr key={domain.id} className="transition-colors hover:bg-panel-2/40">
                    <Td>
                      <span className="flex items-center gap-2 font-mono text-[12.5px] text-chalk">
                        <Globe width={13} height={13} className="text-chalk-dim" />
                        {domain.name}
                      </span>
                    </Td>
                    <Td>
                      <Pill tone={domain.status === "connected" ? "success" : domain.status === "pending" ? "warn" : "danger"}>
                        {domain.status}
                      </Pill>
                    </Td>
                    <Td className="font-mono text-[11.5px] text-chalk-dim">
                      {dateLong(domain.added)}
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        {domain.status !== "connected" ? (
                          <StudioButton
                            onClick={() => verify(domain.id, domain.name)}
                            disabled={checking === domain.id}
                          >
                            <RefreshCw
                              width={13}
                              height={13}
                              className={checking === domain.id ? "animate-spin" : ""}
                            />
                            {checking === domain.id ? "Checking DNS" : "Verify"}
                          </StudioButton>
                        ) : null}
                        <button
                          type="button"
                          aria-label={`Remove ${domain.name}`}
                          onClick={() => {
                            setDomains((prev) => prev.filter((d) => d.id !== domain.id));
                            if (merchant.customDomain === domain.name) {
                              updateMerchant(merchantId, { customDomain: null });
                            }
                            toast.success(`${domain.name} removed`);
                          }}
                          className="grid h-7 w-7 cursor-pointer place-items-center rounded-[2px] text-chalk-dim transition-colors hover:bg-ember/12 hover:text-ember-soft"
                        >
                          <Trash2 width={13} height={13} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </Panel>

        <div className="grid gap-3 self-start">
          <Panel>
            <PanelHead title="Connect a domain" hint="DNS changes happen at your registrar" />
            <Field label="Domain name">
              <input
                className={inputClass}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="myshop.com"
              />
            </Field>
            <StudioButton variant="primary" className="mt-3 w-full" onClick={add}>
              <Globe width={14} height={14} /> Add domain
            </StudioButton>
            <p className="mt-3 text-[12px] leading-relaxed text-chalk-dim">
              Adding a domain is simulated in this prototype. In production Ferixas issues the
              certificate and routes traffic once DNS resolves.
            </p>
          </Panel>

          <Panel>
            <PanelHead title="DNS records" hint="Copy these into your registrar" />
            <div className="space-y-2">
              {DNS_RECORDS.map((record) => (
                <div
                  key={`${record.type}-${record.name}`}
                  className="rounded-[2px] border border-hairline p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-lime">{record.type}</span>
                    <span className="font-mono text-[10.5px] text-chalk-dim">{record.name}</span>
                    <button
                      type="button"
                      aria-label={`Copy ${record.type} record`}
                      onClick={() => copy(record.value, `${record.type} record`)}
                      className="grid h-6 w-6 cursor-pointer place-items-center rounded-[2px] text-chalk-dim hover:text-chalk"
                    >
                      <Copy width={12} height={12} />
                    </button>
                  </div>
                  <p className="mt-1.5 break-all font-mono text-[11.5px] text-chalk">{record.value}</p>
                  <p className="mt-1 font-mono text-[10px] text-chalk-dim">TTL {record.ttl}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex gap-3">
              <ShieldCheck width={18} height={18} className="mt-0.5 shrink-0 text-lime" />
              <div>
                <p className="text-[13px] text-chalk">Certificates and routing</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-chalk-dim">
                  SSL is issued and renewed automatically for every connected domain. Platform
                  addresses are served over HTTPS with no setup.
                </p>
                <p className="mt-3 flex items-center gap-2 font-mono text-[10.5px] text-chalk-dim">
                  <Lock width={12} height={12} /> HSTS enabled \u00b7 TLS 1.3
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </StudioShell>
  );
}
