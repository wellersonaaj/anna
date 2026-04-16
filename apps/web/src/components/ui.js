import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const AppShell = ({ children }) => {
    return _jsx("div", { className: "container stack", children: children });
};
export const Section = ({ title, children }) => {
    return (_jsxs("section", { className: "card stack", children: [_jsx("h2", { style: { margin: 0 }, children: title }), children] }));
};
export const Field = ({ label, children }) => {
    return (_jsxs("label", { className: "stack", style: { gap: 4 }, children: [_jsx("span", { style: { fontSize: 12, fontWeight: 600 }, children: label }), children] }));
};
export const Input = (props) => {
    return (_jsx("input", { ...props, style: {
            border: "1px solid #d9b9bc",
            borderRadius: 10,
            height: 40,
            padding: "0 12px"
        } }));
};
export const Select = (props) => {
    return (_jsx("select", { ...props, style: {
            border: "1px solid #d9b9bc",
            borderRadius: 10,
            height: 40,
            padding: "0 12px"
        } }));
};
export const Button = ({ children, ...props }) => {
    return (_jsx("button", { ...props, style: {
            border: 0,
            borderRadius: 10,
            background: "#b60e3d",
            color: "white",
            height: 40,
            padding: "0 14px",
            cursor: "pointer",
            opacity: props.disabled ? 0.6 : 1
        }, children: children }));
};
const statusColorMap = {
    DISPONIVEL: "#006a39",
    RESERVADO: "#8a6d00",
    VENDIDO: "#5e2d86",
    ENTREGUE: "#176179",
    INDISPONIVEL: "#6a5557"
};
export const StatusBadge = ({ status }) => {
    return (_jsx("span", { style: {
            display: "inline-block",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 12,
            color: "white",
            background: statusColorMap[status]
        }, children: status }));
};
