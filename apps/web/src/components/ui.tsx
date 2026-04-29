import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes
} from "react";
import { useState } from "react";
import { Link } from "react-router-dom";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

type MainTab = "estoque" | "vendas" | "clientes" | "relatorios";

export const AppShell = ({
  children,
  showTopBar = false,
  topBarTitle = "Agente",
  topBarAction,
  showBottomNav = false,
  activeTab = "estoque",
  fabLink = "/items/new/ai",
  maxWidthClass = "max-w-5xl"
}: PropsWithChildren<{
  showTopBar?: boolean;
  topBarTitle?: string;
  topBarAction?: ReactNode;
  showBottomNav?: boolean;
  activeTab?: MainTab;
  fabLink?: string;
  maxWidthClass?: string;
}>) => {
  return (
    <div className="min-h-screen bg-background text-on-background">
      {showTopBar && (
        <header className="fixed inset-x-0 top-0 z-40 border-b border-rose-100 bg-[#fff8f7]/90 backdrop-blur-md">
          <div className={cx("mx-auto flex h-16 items-center justify-between px-4", maxWidthClass)}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-full bg-surface-container-high" />
              <span className="font-headline text-lg font-bold text-primary">{topBarTitle}</span>
            </div>
            <div>{topBarAction}</div>
          </div>
        </header>
      )}
      <div
        className={cx(
          "mx-auto px-4 pb-8 pt-6",
          maxWidthClass,
          showTopBar && "pt-24",
          showBottomNav && "pb-36"
        )}
      >
        <div className="flex flex-col gap-4">{children}</div>
      </div>
      {showBottomNav && <BottomNav activeTab={activeTab} fabLink={fabLink} />}
    </div>
  );
};

export const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => {
  return (
    <section className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
      <h2 className="m-0 mb-3 font-headline text-lg font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
};

export const Field = ({
  label,
  children
}: PropsWithChildren<{ label: string }>) => {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
};

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => {
  const { className, style, ...rest } = props;
  return (
    <input
      {...rest}
      className={cx(
        "h-11 rounded-xl border border-[#d9b9bc] bg-white px-3 text-sm outline-none transition-colors placeholder:text-outline focus:border-primary",
        className
      )}
      style={style}
    />
  );
};

export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => {
  const { className, style, ...rest } = props;
  return (
    <select
      {...rest}
      className={cx(
        "h-11 rounded-xl border border-[#d9b9bc] bg-white px-3 text-sm outline-none transition-colors focus:border-primary",
        className
      )}
      style={style}
    />
  );
};

export const Button = ({
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => {
  const { className, style, ...rest } = props;
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      style={style}
    >
      {children}
    </button>
  );
};

const statusColorMap = {
  DISPONIVEL: "#006a39",
  RESERVADO: "#8a6d00",
  VENDIDO: "#5e2d86",
  ENTREGUE: "#176179",
  INDISPONIVEL: "#6a5557"
};

export const StatusBadge = ({
  status
}: {
  status: keyof typeof statusColorMap;
}) => {
  return (
    <span
      style={{
        display: "inline-block",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        color: "white",
        background: statusColorMap[status]
      }}
    >
      {status}
    </span>
  );
};

const navItemClass = (active: boolean) =>
  cx(
    "flex flex-col items-center justify-center px-2 py-2 text-[11px] font-bold uppercase tracking-wider",
    active ? "text-primary" : "text-on-surface-variant/60"
  );

const BottomNav = ({ activeTab, fabLink }: { activeTab: MainTab; fabLink: string }) => {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] border-t border-rose-100 bg-[#fff8f7]/95 px-2 pt-2 shadow-[0_-12px_40px_rgba(186,19,64,0.08)] backdrop-blur-md"
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-5xl items-end justify-around">
        <Link to="/" className={navItemClass(activeTab === "estoque")}>
          <span className="material-symbols-outlined">inventory_2</span>
          Estoque
        </Link>
        <Link to="/vendas" className={navItemClass(activeTab === "vendas")}>
          <span className="material-symbols-outlined">payments</span>
          Vendas
        </Link>
        <Link
          to={fabLink}
          aria-label="Cadastrar com IA"
          className="relative -top-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_25px_rgba(186,19,64,0.35)] transition-transform active:scale-90"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </Link>
        <Link to="/clientes" className={navItemClass(activeTab === "clientes")}>
          <span className="material-symbols-outlined">group</span>
          Clientes
        </Link>
        <Link to="/relatorios" className={navItemClass(activeTab === "relatorios")}>
          <span className="material-symbols-outlined">analytics</span>
          Relatórios
        </Link>
      </div>
    </nav>
  );
};

export const TopShortcutBar = ({
  shortcuts
}: {
  shortcuts: Array<{ id: string; label: string }>;
}) => {
  return (
    <div className="sticky top-16 z-30 -mx-4 border-b border-rose-100 bg-[#fff8f7]/95 px-4 py-3 backdrop-blur-sm">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {shortcuts.map((shortcut) => (
          <a
            key={shortcut.id}
            href={`#${shortcut.id}`}
            className="whitespace-nowrap rounded-full bg-[#fce7eb] px-4 py-1.5 text-xs font-bold text-primary shadow-sm transition-transform active:scale-95"
          >
            {shortcut.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export const PillButton = ({
  children,
  active,
  onClick
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cx(
      "whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-bold transition-colors",
      active ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
    )}
  >
    {children}
  </button>
);

export const ItemStatusTone = ({
  status,
  compact = false
}: {
  status: keyof typeof statusColorMap;
  compact?: boolean;
}) => {
  const toneMap: Record<keyof typeof statusColorMap, { bg: string; text: string; label: string }> = {
    DISPONIVEL: { bg: "bg-[#006a39]/10", text: "text-[#006a39]", label: "Disponível" },
    RESERVADO: { bg: "bg-amber-500/10", text: "text-amber-700", label: "Reservado" },
    VENDIDO: { bg: "bg-violet-500/10", text: "text-violet-700", label: "Vendido" },
    ENTREGUE: { bg: "bg-cyan-500/10", text: "text-cyan-700", label: "Entregue" },
    INDISPONIVEL: { bg: "bg-zinc-400/10", text: "text-zinc-600", label: "Indisponível" }
  };

  const tone = toneMap[status];
  return (
    <span
      className={cx(
        "inline-flex rounded-full font-bold uppercase tracking-wider",
        tone.bg,
        tone.text,
        compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-[9px]"
      )}
    >
      {tone.label}
    </span>
  );
};

export const ProductCard = ({
  item,
  subtitle,
  priceLabel,
  children
}: {
  item: { nome: string; status: keyof typeof statusColorMap; fotoCapaUrl?: string | null };
  subtitle: string;
  priceLabel?: string;
  children?: ReactNode;
}) => {
  const [imageBroken, setImageBroken] = useState(false);
  const hasImage = Boolean(item.fotoCapaUrl) && !imageBroken;

  return (
    <article className="group">
      <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-xl bg-surface-container-low">
        {hasImage ? (
          <img
            src={item.fotoCapaUrl ?? undefined}
            alt={`Foto da peça ${item.nome}`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageBroken(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-outline">Sem foto</div>
        )}
        <div className="absolute left-3 top-3">
          <ItemStatusTone status={item.status} />
        </div>
      </div>
      <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-outline">{subtitle}</p>
      <h3 className="mb-1 text-sm font-bold leading-tight tracking-tight text-on-background">{item.nome}</h3>
      {priceLabel && <p className="text-sm font-bold text-on-background">{priceLabel}</p>}
      {children}
    </article>
  );
};

export const formatCurrency = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") {
    return "Preço a confirmar";
  }
  const asNumber = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  if (Number.isNaN(asNumber)) {
    return "Preço a confirmar";
  }
  return asNumber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const relativeAgeLabel = (createdAt: string): { label: string; tone: CSSProperties["color"] } => {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)));
  if (hours >= 24) {
    return { label: `há ${hours}h`, tone: "#ef4444" };
  }
  if (hours >= 1) {
    return { label: `há ${hours}h`, tone: "#f59e0b" };
  }
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60)));
  return { label: `há ${minutes}m`, tone: "#9ca3af" };
};
