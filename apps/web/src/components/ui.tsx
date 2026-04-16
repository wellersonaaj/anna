import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  SelectHTMLAttributes
} from "react";

export const AppShell = ({ children }: PropsWithChildren) => {
  return <div className="container stack">{children}</div>;
};

export const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => {
  return (
    <section className="card stack">
      <h2 style={{ margin: 0 }}>{title}</h2>
      {children}
    </section>
  );
};

export const Field = ({
  label,
  children
}: PropsWithChildren<{ label: string }>) => {
  return (
    <label className="stack" style={{ gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
};

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      {...props}
      style={{
        border: "1px solid #d9b9bc",
        borderRadius: 10,
        height: 40,
        padding: "0 12px"
      }}
    />
  );
};

export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => {
  return (
    <select
      {...props}
      style={{
        border: "1px solid #d9b9bc",
        borderRadius: 10,
        height: 40,
        padding: "0 12px"
      }}
    />
  );
};

export const Button = ({
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => {
  return (
    <button
      {...props}
      style={{
        border: 0,
        borderRadius: 10,
        background: "#b60e3d",
        color: "white",
        height: 40,
        padding: "0 14px",
        cursor: "pointer",
        opacity: props.disabled ? 0.6 : 1
      }}
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
