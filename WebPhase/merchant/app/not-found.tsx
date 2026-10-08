import Link from "next/link";

export default function NotFound() {
  return <div className="mx-auto grid min-h-[50vh] max-w-[560px] place-items-center"><div className="w-full rounded-[7px] border border-hairline bg-panel p-6 text-center"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">404</p><h1 className="mt-2 font-display text-[20px] font-semibold text-chalk">Record not found</h1><Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-[5px] bg-ember px-4 py-2.5 text-[12.5px] font-semibold text-white">Back to dashboard</Link></div></div>;
}
