import { cn } from "@/lib/utils";

export function VoteVoterList({
  names,
  emptyLabel = "Brak głosów",
  accentClassName,
}: {
  names: string[];
  emptyLabel?: string;
  accentClassName: string;
}) {
  return (
    <div className="mt-auto border-t border-slate-700/50 pt-3">
      <p
        className={cn(
          "mb-1.5 text-[10px] font-semibold uppercase tracking-wide",
          accentClassName
        )}
      >
        Zagłosowali
      </p>
      {names.length === 0 ? (
        <p className="text-[11px] text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="max-h-24 space-y-0.5 overflow-y-auto text-[11px] leading-snug text-slate-300">
          {names.map((name) => (
            <li key={name} className="truncate">
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
