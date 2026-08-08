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
  // role="status" announces the loading state politely; aria-busy tells AT the
  // region is still populating.
  if (loading)
    return (
      <div className="card text-slate-500" role="status" aria-busy="true">
        Loading dataset…
      </div>
    );

  // role="alert" is assertive — an error is worth interrupting for.
  if (error)
    return (
      <div className="card border-l-4 border-l-rose-500" role="alert">
        <h2 className="font-medium text-rose-700">
          <span aria-hidden="true">⚠ </span>Something went wrong
        </h2>
        <div className="mt-1 text-sm text-slate-600">{error}</div>
        <div className="mt-3 text-xs text-slate-500">
          If you're running locally, make sure the API server is running
          (<code>npm run dev</code> starts both the client and the API).
        </div>
      </div>
    );

  return <>{children}</>;
}
