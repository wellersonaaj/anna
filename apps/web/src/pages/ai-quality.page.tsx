import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppShell, Section } from "../components/ui";
import { getAiQualityMetrics } from "../api/items";
import { useSessionStore } from "../store/session.store";

export const AiQualityPage = () => {
  const brechoId = useSessionStore((state) => state.brechoId);

  const qualityQuery = useQuery({
    queryKey: ["ai-quality-metrics", brechoId],
    queryFn: () => getAiQualityMetrics(brechoId, { days: 30 })
  });

  return (
    <AppShell>
      <Link to="/">← Voltar ao estoque</Link>
      <header>
        <h1 style={{ marginBottom: 4 }}>Qualidade da IA</h1>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Métricas dos últimos 30 dias para monitorar assertividade e evolução.
        </p>
      </header>

      {qualityQuery.isLoading && <p>Carregando métricas...</p>}
      {qualityQuery.isError && <p>Não foi possível carregar métricas de qualidade.</p>}

      {qualityQuery.data && (
        <>
          <Section title="Visão geral">
            <div className="grid cols-2">
              <p style={{ margin: 0 }}>
                <strong>Análises:</strong> {qualityQuery.data.analysesCount}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Feedbacks:</strong> {qualityQuery.data.feedbackCount}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Período:</strong> {qualityQuery.data.periodDays} dias
              </p>
              <p style={{ margin: 0 }}>
                <strong>Desde:</strong> {new Date(qualityQuery.data.since).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </Section>

          <Section title="Taxa de null por campo">
            <div className="stack" style={{ gap: 6 }}>
              {Object.entries(qualityQuery.data.nullRateByField).map(([field, info]) => (
                <p key={field} style={{ margin: 0 }}>
                  <strong>{field}</strong>: {Math.round(info.nullRate * 100)}% ({info.nullCount}/{info.total})
                </p>
              ))}
            </div>
          </Section>

          <Section title="Aceitação por campo">
            <div className="stack" style={{ gap: 6 }}>
              {Object.entries(qualityQuery.data.editAndAcceptanceByField).map(([field, info]) => (
                <p key={field} style={{ margin: 0 }}>
                  <strong>{field}</strong>: aceitação {Math.round(info.acceptanceRate * 100)}% · edição{" "}
                  {Math.round(info.editRate * 100)}%
                </p>
              ))}
            </div>
          </Section>

          <Section title="Distribuição de helpfulness">
            <p style={{ margin: 0 }}>
              SIM: {qualityQuery.data.helpfulnessDistribution.SIM ?? 0} · PARCIAL:{" "}
              {qualityQuery.data.helpfulnessDistribution.PARCIAL ?? 0} · NÃO:{" "}
              {qualityQuery.data.helpfulnessDistribution.NAO ?? 0}
            </p>
          </Section>

          <Section title="Top motivos">
            {qualityQuery.data.topReasonCodes.length === 0 ? (
              <p style={{ margin: 0, opacity: 0.8 }}>Sem motivos registrados no período.</p>
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                {qualityQuery.data.topReasonCodes.map((reason) => (
                  <p key={reason.code} style={{ margin: 0 }}>
                    <strong>{reason.code}</strong>: {reason.count}
                  </p>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </AppShell>
  );
};
