interface StatusBadgeProps {
  pass: boolean;
  passLabel?: string;
  failLabel?: string;
}

export default function StatusBadge({
  pass,
  passLabel = 'Pass',
  failLabel = 'Fail',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        pass
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          pass ? 'bg-emerald-500' : 'bg-red-500'
        }`}
      />
      {pass ? passLabel : failLabel}
    </span>
  );
}
