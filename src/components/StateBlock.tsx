import { ReactNode } from "react";

export default function StateBlock({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: string | null;
  children: ReactNode;
}) {
  if (loading) return <div className="card text-slate-500">Loading dataset…</div>;
  if (error)
    return (
      <div className="card border-l-4 border-l-rose-500">
        <div className="font-medium text-rose-700">Something went wrong</div>
        <div className="mt-1 text-sm text-slate-600">{error}</div>
        <div className="mt-3 text-xs text-slate-500">
          If you're running locally, make sure the API server is running on port 8787
          (<code>npm run dev:server</code>).
        </div>
      </div>
    );
  return <>{children}</>;
}
