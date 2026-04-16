import type { ItemAiAnalysis } from "../api/items";

const categoriaLabels: Record<string, string> = {
  ROUPA_FEMININA: "Roupa feminina",
  ROUPA_MASCULINA: "Roupa masculina",
  CALCADO: "Calçado",
  ACESSORIO: "Acessório"
};

const condicaoLabels: Record<string, string> = {
  OTIMO: "Ótimo",
  BOM: "Bom",
  REGULAR: "Regular"
};

export const FotoAiSuggestionsCard = ({ analysis }: { analysis: ItemAiAnalysis }) => {
  const lowConfidence = analysis.confianca < 0.6;
  const multiplas = analysis.multiplasPecas;

  return (
    <div
      style={{
        fontSize: 13,
        marginTop: 8,
        padding: 12,
        background: "#f0f7f2",
        borderRadius: 10,
        border: "1px solid #c5e0cc"
      }}
    >
      <strong style={{ display: "block", marginBottom: 8 }}>Sugestão da IA (revise antes de usar)</strong>
      {lowConfidence && (
        <p style={{ color: "#7a5a00", margin: "0 0 6px", fontWeight: 600 }}>
          Confiança baixa — confira manualmente.
        </p>
      )}
      {multiplas && (
        <p style={{ color: "#7a5a00", margin: "0 0 6px", fontWeight: 600 }}>
          Vários itens na foto — resultado pode ser impreciso.
        </p>
      )}
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
        {analysis.nomeSugerido && (
          <li>
            <strong>Nome:</strong> {analysis.nomeSugerido}
          </li>
        )}
        {analysis.categoria && (
          <li>
            <strong>Categoria:</strong> {categoriaLabels[analysis.categoria] ?? analysis.categoria}
          </li>
        )}
        {analysis.subcategoria && (
          <li>
            <strong>Subcategoria:</strong> {analysis.subcategoria}
          </li>
        )}
        {analysis.corPrincipal && (
          <li>
            <strong>Cor:</strong> {analysis.corPrincipal}
          </li>
        )}
        <li>
          <strong>Estampa:</strong> {analysis.estampado ? "Sim" : "Não"}
          {analysis.descricaoEstampa ? ` (${analysis.descricaoEstampa})` : ""}
        </li>
        {analysis.condicao && (
          <li>
            <strong>Condição:</strong> {condicaoLabels[analysis.condicao] ?? analysis.condicao}
          </li>
        )}
        <li>
          <strong>Confiança:</strong> {Math.round(analysis.confianca * 100)}%
        </li>
        {(analysis.ambienteFoto || analysis.qualidadeFoto) && (
          <li style={{ opacity: 0.85 }}>
            <strong>Foto:</strong> {analysis.ambienteFoto ?? "—"} · qualidade {analysis.qualidadeFoto ?? "—"}
          </li>
        )}
      </ul>
    </div>
  );
};
