"use client";

import { RefreshCw } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto grid min-h-[50vh] max-w-[560px] place-items-center">
      <div className="w-full rounded-[7px] border border-ember/35 bg-panel p-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ember">Workspace error</p>
        <h1 className="mt-2 font-display text-[20px] font-semibold text-chalk">We could not load this view</h1>
        
        <button type="button" onClick={() => reset()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[5px] bg-ember px-4 py-2.5 text-[12.5px] font-semibold text-white hover:bg-[#c74725]"><RefreshCw width={14} height={14} /> Try again</button>
      </div>
    </div>
  );
}
