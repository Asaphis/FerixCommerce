import Link from "next/link";
export default function NotFound() {
  return <main className="grid min-h-[55vh] place-items-center"><div className="max-w-md rounded-[.65rem] border border-hairline bg-panel p-6 text-center"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-chalk-dim">404 / Not found</p><h1 className="mt-2 font-display text-xl font-semibold text-chalk">That admin view is unavailable.</h1><Link href="/" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[.55rem] bg-signal px-4 py-2 text-[13px] font-semibold text-void">Back to overview</Link></div></main>;
}
