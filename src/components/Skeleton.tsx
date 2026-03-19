/**
 * Reusable skeleton components for loading states.
 * Uses CSS animation instead of tailwind to keep bundle small.
 */

function Pulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: "#1e1e2a",
        borderRadius: "0.5rem",
        animation: "pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}
    >
      <div className="flex items-start gap-4">
        <Pulse style={{ width: 40, height: 40, borderRadius: "0.75rem", flexShrink: 0 }} />
        <div className="flex-1 space-y-2">
          <Pulse style={{ width: "60%", height: 16 }} />
          <Pulse style={{ width: "90%", height: 12 }} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}
    >
      <Pulse style={{ width: "40%", height: 12, marginBottom: 12 }} />
      <Pulse style={{ width: "30%", height: 28 }} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Pulse style={{ width: 80, height: 14 }} />
      <Pulse style={{ width: "50%", height: 14, flex: 1 }} />
      <Pulse style={{ width: 60, height: 22, borderRadius: 999 }} />
      <Pulse style={{ width: 70, height: 14 }} />
    </div>
  );
}

export function SkeletonText({ width = "100%" }: { width?: string }) {
  return <Pulse style={{ width, height: 14 }} />;
}

export function SubmitPageSkeleton() {
  return (
    <div>
      <div className="mb-8">
        <Pulse style={{ width: 200, height: 28, marginBottom: 8 }} />
        <Pulse style={{ width: 300, height: 14 }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function TicketListSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Pulse style={{ width: 120, height: 28 }} />
        <Pulse style={{ width: 140, height: 36, borderRadius: "0.5rem" }} />
      </div>
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{ borderBottom: i < 5 ? "1px solid #1a1a22" : "none" }}
          >
            <SkeletonRow />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-8">
        <Pulse style={{ width: 250, height: 28, marginBottom: 8 }} />
        <Pulse style={{ width: 180, height: 14 }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}
        >
          <Pulse style={{ width: 140, height: 16, marginBottom: 24 }} />
          <Pulse style={{ width: 200, height: 200, borderRadius: "50%", margin: "0 auto" }} />
        </div>
        <div
          className="rounded-xl border p-6"
          style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}
        >
          <Pulse style={{ width: 120, height: 16, marginBottom: 16 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Pulse style={{ width: 60, height: 14 }} />
              <Pulse style={{ width: "60%", height: 14 }} />
              <Pulse style={{ width: 50, height: 20, borderRadius: 999 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TicketDetailSkeleton() {
  return (
    <div>
      <Pulse style={{ width: 80, height: 14, marginBottom: 24 }} />
      <div className="flex gap-8">
        <div className="flex-1">
          <Pulse style={{ width: "70%", height: 28, marginBottom: 8 }} />
          <Pulse style={{ width: 60, height: 22, borderRadius: 999, marginBottom: 24 }} />
          <div
            className="rounded-xl border p-6"
            style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}
          >
            <Pulse style={{ width: 100, height: 16, marginBottom: 16 }} />
            <Pulse style={{ width: "100%", height: 14, marginBottom: 8 }} />
            <Pulse style={{ width: "80%", height: 14, marginBottom: 8 }} />
            <Pulse style={{ width: "60%", height: 14 }} />
          </div>
          <div
            className="rounded-xl border p-6 mt-6"
            style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}
          >
            <Pulse style={{ width: 120, height: 16, marginBottom: 16 }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="mb-4">
                <Pulse style={{ width: 100, height: 12, marginBottom: 8 }} />
                <Pulse style={{ width: "90%", height: 14 }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 280 }}>
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: "#141418", borderColor: "#1e1e2a" }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="mb-4">
                <Pulse style={{ width: 60, height: 12, marginBottom: 6 }} />
                <Pulse style={{ width: 120, height: 14 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
