import { ZodError, type ZodIssue } from "zod";

export type ValidationIssue = {
  field: string;
  label: string;
  message: string;
};

export type ValidationErrorBody = {
  code: "VALIDATION_ERROR";
  message: string;
  issues: ValidationIssue[];
};

const DEFAULT_FIELD_LABELS: Record<string, string> = {
  nome: "Nome",
  categoria: "Categoria",
  subcategoria: "Subcategoria",
  cor: "Cor",
  tamanho: "Tamanho",
  marca: "Marca",
  condicao: "Condição",
  estampa: "Estampa",
  precoVenda: "Preço de venda",
  acervoTipo: "Tipo de acervo",
  acervoNome: "Nome do acervo/consignante",
  telefone: "Telefone",
  password: "Senha",
  currentPassword: "Senha atual",
  newPassword: "Nova senha",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  cliente: "Cliente",
  textoNota: "Observação",
  search: "Busca",
  days: "Período (dias)",
  limit: "Limite",
  offset: "Página",
  pecaIds: "Peças",
  q: "Busca"
};

const GENERIC_ZOD_MESSAGE =
  /^(String|Number|Invalid|Expected|Required|Too small|Too big)/i;

const fieldKeyFromPath = (path: ZodIssue["path"]): string => path.map(String).join(".");

const labelForField = (field: string, extra?: Record<string, string>): string => {
  if (extra?.[field]) {
    return extra[field];
  }
  const root = field.split(".")[0] ?? field;
  return extra?.[root] ?? DEFAULT_FIELD_LABELS[root] ?? DEFAULT_FIELD_LABELS[field] ?? root;
};

const messageForIssue = (issue: ZodIssue, label: string): string => {
  if (issue.message && !GENERIC_ZOD_MESSAGE.test(issue.message)) {
    return issue.message;
  }

  switch (issue.code) {
    case "too_small":
      if (issue.type === "string") {
        return `Informe ${label} com pelo menos ${issue.minimum} caractere(s).`;
      }
      if (issue.type === "array") {
        return `Selecione pelo menos ${issue.minimum} item(ns) em ${label}.`;
      }
      return `Valor de ${label} é muito pequeno.`;
    case "too_big":
      if (issue.type === "string") {
        return `${label} deve ter no máximo ${issue.maximum} caractere(s).`;
      }
      return `Valor de ${label} é muito grande.`;
    case "invalid_enum_value":
      return `Selecione um valor válido para ${label}.`;
    case "invalid_type":
      return `Preencha ${label} corretamente.`;
    case "custom":
      return issue.message || `Valor inválido em ${label}.`;
    default:
      return issue.message || `Valor inválido em ${label}.`;
  }
};

export const formatZodValidationError = (
  error: ZodError,
  options?: { fieldLabels?: Record<string, string> }
): ValidationErrorBody => {
  const issues: ValidationIssue[] = error.issues.map((issue) => {
    const field = fieldKeyFromPath(issue.path);
    const label = labelForField(field, options?.fieldLabels);
    const message = messageForIssue(issue, label);
    return { field, label, message };
  });

  const first = issues[0];
  const message =
    issues.length === 0
      ? "Verifique os dados informados."
      : issues.length === 1 && first
        ? `${first.label}: ${first.message}`
        : `Corrija os campos: ${issues.map((i) => i.label).join(", ")}.`;

  return {
    code: "VALIDATION_ERROR",
    message,
    issues
  };
};

export const validationErrorResponse = (
  error: ZodError,
  options?: { fieldLabels?: Record<string, string> }
): { statusCode: 400; body: ValidationErrorBody } => ({
  statusCode: 400,
  body: formatZodValidationError(error, options)
});
