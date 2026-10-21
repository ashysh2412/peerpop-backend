/** Grey placeholder cards shown the moment a page opens, while its data loads. */
export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card flex animate-pulse flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="h-11 w-11 shrink-0 rounded-full bg-sunken" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-3 w-1/3 rounded-full bg-sunken" />
              <span className="h-3 w-1/4 rounded-full bg-sunken" />
            </span>
          </div>
          <span className="h-3 w-full rounded-full bg-sunken" />
          <span className="h-3 w-4/5 rounded-full bg-sunken" />
        </div>
      ))}
    </div>
  );
}
