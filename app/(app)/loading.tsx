export default function Loading() {
  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] bg-background p-6 space-y-8 overflow-hidden select-none">
      {/* NProgress style top loading bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-indigo-100 z-50 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-500 w-full animate-pulse origin-left" />
      </div>

      {/* Header Skeleton */}
      <div className="flex justify-between items-center pb-2">
        <div className="space-y-2.5">
          <div className="h-7 w-36 bg-muted/65 rounded-xl shimmer" />
          <div className="h-4 w-52 bg-muted/50 rounded-lg shimmer" />
        </div>
        <div className="h-10 w-28 bg-muted/65 rounded-xl shimmer" />
      </div>

      {/* Card Grid Skeleton (3 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border bg-white rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-muted/60 shimmer" />
              <div className="h-4 w-32 bg-muted/60 rounded-lg shimmer" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-muted/40 rounded-lg shimmer" />
              <div className="h-3.5 w-[80%] bg-muted/40 rounded-lg shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Large Content Area Skeleton */}
      <div className="border border-border bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <div className="h-5 w-24 bg-muted/65 rounded-lg shimmer" />
        <div className="space-y-4.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0">
              <div className="space-y-2 flex-1">
                <div className="h-4.5 w-[50%] bg-muted/50 rounded-lg shimmer" />
                <div className="h-3.5 w-[30%] bg-muted/35 rounded-lg shimmer" />
              </div>
              <div className="h-8 w-16 bg-muted/45 rounded-lg shimmer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
