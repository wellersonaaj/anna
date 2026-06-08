import type { ReactNode } from "react";

export type ReportMetricFootnote = {
  tone: "neutral" | "warning";
  text: ReactNode;
};

type ReportMetricCardProps = {
  value: ReactNode;
  label: string;
  helpText: string;
  icon: string;
  iconClassName?: string;
  valueClassName?: string;
  footnotes?: ReportMetricFootnote[];
  action?: ReactNode;
  extra?: ReactNode;
  shadow?: boolean;
};

const footnoteClass = (tone: ReportMetricFootnote["tone"]) =>
  tone === "warning" ? "text-amber-700" : "text-gray-500";

export const ReportMetricCard = ({
  value,
  label,
  helpText,
  icon,
  iconClassName = "bg-rose-50 text-primary",
  valueClassName = "",
  footnotes = [],
  action,
  extra,
  shadow = false
}: ReportMetricCardProps) => (
  <div
    className={`flex items-center justify-between rounded-3xl border border-rose-50 bg-white p-6${shadow ? " shadow-sm" : ""}`}
  >
    <div className="min-w-0 flex-1">
      <span className={`block text-4xl font-extrabold ${valueClassName}`}>{value}</span>
      <span className="text-sm font-semibold text-gray-500">{label}</span>
      <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      {footnotes.map((note, index) => (
        <p key={index} className={`mt-1 text-xs ${footnoteClass(note.tone)}`}>
          {note.text}
        </p>
      ))}
      {action && <div className="mt-1">{action}</div>}
      {extra}
    </div>
    <div className={`ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}>
      <span className="material-symbols-outlined">{icon}</span>
    </div>
  </div>
);
