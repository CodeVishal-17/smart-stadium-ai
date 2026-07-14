type Props = {
  onClick: () => void;
  loading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
};

export function LoadingButton({ onClick, loading, children, disabled }: Props) {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={loading || disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-2.5 text-sm font-bold text-emerald-950 shadow-[0_0_0_1px_rgba(52,211,153,0.4),0_4px_16px_-4px_rgba(16,185,129,0.6)] transition-all hover:from-emerald-300 hover:to-emerald-500 hover:shadow-[0_0_0_1px_rgba(52,211,153,0.6),0_6px_20px_-4px_rgba(16,185,129,0.8)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-300 disabled:shadow-none"
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-950 border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
