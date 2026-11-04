export default function AppLoading() {
  return (
    <div className="mx-auto flex w-full max-w-lg animate-pulse flex-col gap-6 px-4 py-8" role="status">
      <span className="sr-only">Loading page</span>
      <div className="h-3 w-20 rounded bg-neutral-200" />
      <div className="h-9 w-52 rounded bg-neutral-200" />
      <div className="h-24 rounded-xl bg-neutral-200" />
      <div className="h-24 rounded-xl bg-neutral-200" />
      <div className="h-24 rounded-xl bg-neutral-200" />
    </div>
  );
}
