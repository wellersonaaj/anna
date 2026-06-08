export type LucroCompleteness = "empty" | "partial" | "complete";

export const getLucroCompleteness = (
  vendasSemCusto: number,
  vendasNoPeriodo: number
): LucroCompleteness => {
  if (vendasNoPeriodo === 0 || vendasSemCusto >= vendasNoPeriodo) {
    return "empty";
  }
  if (vendasSemCusto > 0) {
    return "partial";
  }
  return "complete";
};

export const formatLucroDisplay = (
  value: number,
  completeness: LucroCompleteness,
  formatCurrency: (amount: number) => string
): string => {
  if (completeness === "empty") {
    return "—";
  }
  return formatCurrency(value);
};

export const buildLucroFootnotes = (
  summary: {
    vendasNoPeriodo: number;
    vendasComCusto: number;
    vendasSemCusto: number;
    margemBrutaPct: number | null;
    custosFreteEmbalagem?: number;
    despesasGerais?: number;
  },
  completeness: LucroCompleteness,
  variant: "bruto" | "operacional" | "liquido"
): Array<{ tone: "neutral" | "warning"; text: string }> => {
  const notes: Array<{ tone: "neutral" | "warning"; text: string }> = [];

  if (completeness === "empty" && summary.vendasNoPeriodo > 0) {
    notes.push({
      tone: "warning",
      text: `${summary.vendasSemCusto} venda${summary.vendasSemCusto === 1 ? "" : "s"} sem custo — cadastre abaixo para calcular o lucro`
    });
  } else if (completeness === "partial") {
    notes.push({
      tone: "warning",
      text: `${summary.vendasComCusto} de ${summary.vendasNoPeriodo} vendas com custo — ${summary.vendasSemCusto} pendente${summary.vendasSemCusto === 1 ? "" : "s"}`
    });
  }

  if (variant === "bruto" && completeness !== "empty" && summary.margemBrutaPct != null) {
    notes.push({
      tone: "neutral",
      text: `Margem bruta: ${summary.margemBrutaPct.toFixed(0)}% (vendas com custo cadastrado)`
    });
  }

  if (
    variant === "operacional" &&
    completeness !== "empty" &&
    summary.custosFreteEmbalagem != null &&
    summary.custosFreteEmbalagem > 0
  ) {
    notes.push({
      tone: "neutral",
      text: `Após custos de frete/embalagem das vendas com custo cadastrado`
    });
  }

  if (
    variant === "liquido" &&
    completeness !== "empty" &&
    summary.despesasGerais != null &&
    summary.despesasGerais > 0
  ) {
    notes.push({
      tone: "neutral",
      text: `Após despesas gerais do brechó no período`
    });
  }

  return notes;
};

export const buildFaturamentoFootnotes = (
  summary: {
    faturamentoPecas: number;
    freteInclusoInformado: number;
    aguardandoEnvio: {
      count: number;
      valorPecas: number;
      countNoPeriodo: number;
      valorNoPeriodo: number;
    };
  },
  formatCurrency: (amount: number) => string
): Array<{ tone: "neutral" | "warning"; text: string }> => {
  const notes: Array<{ tone: "neutral" | "warning"; text: string }> = [
    {
      tone: "neutral",
      text: "Parte desse valor pode ser de peças ainda não enviadas — não é um valor extra."
    }
  ];

  if (summary.freteInclusoInformado > 0) {
    notes.push({
      tone: "neutral",
      text: `Incl. ${formatCurrency(summary.freteInclusoInformado)} em frete (informado nas vendas)`
    });
  }

  const { aguardandoEnvio } = summary;
  if (aguardandoEnvio.count > 0) {
    const valorLabel = formatCurrency(aguardandoEnvio.valorPecas);
    if (aguardandoEnvio.countNoPeriodo === aguardandoEnvio.count) {
      notes.push({
        tone: "warning",
        text: `${aguardandoEnvio.count} aguardando envio (${valorLabel}) · já incluído no faturamento acima`
      });
    } else if (aguardandoEnvio.valorNoPeriodo > 0) {
      notes.push({
        tone: "warning",
        text: `${aguardandoEnvio.count} aguardando envio (${valorLabel}) · ${formatCurrency(aguardandoEnvio.valorNoPeriodo)} já no faturamento do mês`
      });
    } else {
      notes.push({
        tone: "warning",
        text: `${aguardandoEnvio.count} aguardando envio (${valorLabel}) · vendas anteriores ao período`
      });
    }
  }

  return notes;
};
