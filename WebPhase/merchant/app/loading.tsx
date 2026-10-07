export default function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center rounded-[7px] border border-dashed border-hairline bg-panel p-8">
      <div className="text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-ember/25 border-t-ember" aria-hidden="true" />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-chalk-dim">Loading workspace</p>
      </div>
    </div>
  );
}
