import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  SelectHTMLAttributes
} from "react";
import { useEffect, useState } from "react";
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
  fabLink = "/items/new",
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

export const Section = ({ title, children }: PropsWithChildren<{ title: ReactNode }>) => {
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
  children,
  onImageClick
}: {
  item: {
    nome: string;
    status: keyof typeof statusColorMap;
    fotoCapaUrl?: string | null;
    fotoCapaThumbnailUrl?: string | null;
    fotoCapaId?: string | null;
    fotoPreviews?: Array<{ id: string; displayUrl: string }>;
  };
  subtitle: string;
  priceLabel?: string;
  children?: ReactNode;
  onImageClick?: () => void;
}) => {
  const previews = item.fotoPreviews;
  const hasPreviews = Boolean(previews?.length);
  const previewKey = previews?.map((p) => p.id).join("|") ?? "";

  const [previewIndex, setPreviewIndex] = useState(0);
  const [imageBroken, setImageBroken] = useState(false);
  const [previewImageReady, setPreviewImageReady] = useState(true);

  useEffect(() => {
    setImageBroken(false);
    if (!previews?.length) {
      setPreviewIndex(0);
      return;
    }
    const coverIdx = item.fotoCapaId ? previews.findIndex((p) => p.id === item.fotoCapaId) : 0;
    setPreviewIndex(coverIdx >= 0 ? coverIdx : 0);
  }, [item.fotoCapaId, previewKey]);

  const fallbackSrc = item.fotoCapaThumbnailUrl ?? item.fotoCapaUrl ?? null;
  const displaySrc = hasPreviews ? (previews![previewIndex]?.displayUrl ?? null) : fallbackSrc;
  const hasImage = Boolean(displaySrc) && !imageBroken;

  useEffect(() => {
    if (!displaySrc) {
      setPreviewImageReady(true);
      return;
    }
    setPreviewImageReady(false);
  }, [displaySrc]);

  useEffect(() => {
    if (!previews?.length || previews.length < 2) {
      return;
    }
    const n = previews.length;
    const prevIdx = (previewIndex - 1 + n) % n;
    const nextIdx = (previewIndex + 1) % n;
    const a = new Image();
    a.src = previews[prevIdx]!.displayUrl;
    const b = new Image();
    b.src = previews[nextIdx]!.displayUrl;
  }, [previewIndex, previewKey]);

  const goPreview = (delta: number, e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!previews?.length) {
      return;
    }
    const n = previews.length;
    setPreviewIndex((i) => (i + delta + n) % n);
  };

  const showCarouselControls = hasPreviews && previews!.length > 1;
  const showPreviewLoadingOverlay = Boolean(hasImage && !previewImageReady);

  const image = hasImage ? (
    <img
      src={displaySrc ?? undefined}
      alt={`Foto da peça ${item.nome}`}
      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      loading={showCarouselControls ? "eager" : "lazy"}
      onLoad={() => setPreviewImageReady(true)}
      onError={() => {
        setImageBroken(true);
        setPreviewImageReady(true);
      }}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-outline">Sem foto</div>
  );

  return (
    <article className="group">
      <div
        className="relative mb-3 aspect-[4/5] overflow-hidden rounded-xl bg-surface-container-low"
        aria-busy={showPreviewLoadingOverlay}
      >
        {onImageClick && hasImage ? (
          <button type="button" onClick={onImageClick} className="relative z-0 block h-full w-full cursor-zoom-in p-0">
            {image}
          </button>
        ) : (
          <div className="relative z-0 h-full w-full">{image}</div>
        )}
        {showPreviewLoadingOverlay ? (
          <div
            className="pointer-events-none absolute inset-0 z-[8] flex items-center justify-center bg-black/10"
            aria-hidden
          >
            <span className="inline-block h-9 w-9 animate-spin rounded-full border-2 border-white/40 border-t-white/90 shadow-sm" />
          </div>
        ) : null}
        {showCarouselControls ? (
          <>
            <button
              type="button"
              onClick={(e) => goPreview(-1, e)}
              className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/35 px-2 py-1.5 text-lg font-bold leading-none text-white opacity-65 shadow-md backdrop-blur-[2px] transition-opacity hover:opacity-100 group-hover:opacity-85"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => goPreview(1, e)}
              className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/35 px-2 py-1.5 text-lg font-bold leading-none text-white opacity-65 shadow-md backdrop-blur-[2px] transition-opacity hover:opacity-100 group-hover:opacity-85"
              aria-label="Próxima foto"
            >
              ›
            </button>
          </>
        ) : null}
        <div className="pointer-events-none absolute left-3 top-3 z-20">
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

export const PhotoLightbox = ({
  photos,
  initialIndex,
  title,
  onClose,
  coverPhotoId,
  onSetCover,
  setCoverPending = false
}: {
  photos: Array<{ id: string; url: string; thumbnailUrl?: string | null; alt?: string }>;
  initialIndex: number;
  title: string;
  onClose: () => void;
  coverPhotoId?: string | null;
  onSetCover?: (photoId: string) => void;
  setCoverPending?: boolean;
}) => {
  const [index, setIndex] = useState(initialIndex);
  const [fullLoaded, setFullLoaded] = useState(false);
  const total = photos.length;
  const photo = photos[index];

  useEffect(() => {
    setFullLoaded(false);
  }, [index, photo?.url]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!photo) {
    return null;
  }

  const showPreviewUnder =
    Boolean(photo.thumbnailUrl) && photo.thumbnailUrl !== photo.url && !fullLoaded;

  const goTo = (nextIndex: number) => {
    setIndex((nextIndex + total) % total);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex select-none flex-col bg-black/90 p-4 text-white [-webkit-touch-callout:none]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative z-20 mb-3 flex shrink-0 items-center justify-between gap-3">
        <div>
          <strong className="block text-sm">{title}</strong>
          <span className="text-xs text-white/70">
            {index + 1} de {total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onSetCover &&
            (photo.id === coverPhotoId ? (
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/80">Capa</span>
            ) : (
              <button
                type="button"
                onClick={() => onSetCover(photo.id)}
                disabled={setCoverPending}
                className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {setCoverPending ? "Salvando..." : "Definir como capa"}
              </button>
            ))}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white"
          >
            Fechar
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2">
        {total > 1 && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="rounded-full bg-white/10 px-3 py-3 text-2xl font-bold"
            aria-label="Foto anterior"
          >
            ‹
          </button>
        )}
        <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
          {showPreviewUnder ? (
            <img
              src={photo.thumbnailUrl ?? undefined}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-h-full max-w-full select-none rounded-2xl object-contain opacity-90"
              aria-hidden
            />
          ) : null}
          <img
            src={photo.url}
            alt={photo.alt ?? title}
            draggable={false}
            className="relative max-h-full min-w-0 select-none rounded-2xl object-contain"
            onLoad={() => setFullLoaded(true)}
          />
        </div>
        {total > 1 && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="rounded-full bg-white/10 px-3 py-3 text-2xl font-bold"
            aria-label="Próxima foto"
          >
            ›
          </button>
        )}
      </div>
    </div>
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
