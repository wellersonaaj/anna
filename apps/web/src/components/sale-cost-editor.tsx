import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { updateSale } from "../api/items";
import { Button, Input, formatCurrency } from "./ui";
import { parseMoneyLike } from "../lib/money";

type SaleCostEditorProps = {
  brechoId: string;
  saleId: string;
  pecaId: string;
  pecaNome: string;
  pecaCodigo?: string | null;
  precoVenda: number;
  criadoEm?: string;
  clienteNome?: string;
  pecaPrecoCusto?: number | null;
  pecaThumbnailUrl?: string | null;
  initialPrecoCusto?: number | null;
  compact?: boolean;
  onSuccess?: () => void;
};

export const SaleCostEditor = ({
  brechoId,
  saleId,
  pecaId,
  pecaNome,
  pecaCodigo,
  precoVenda,
  criadoEm,
  clienteNome,
  pecaPrecoCusto,
  pecaThumbnailUrl,
  initialPrecoCusto,
  compact = false,
  onSuccess
}: SaleCostEditorProps) => {
  const queryClient = useQueryClient();
  const [custo, setCusto] = useState(
    initialPrecoCusto != null ? String(initialPrecoCusto) : pecaPrecoCusto != null ? String(pecaPrecoCusto) : ""
  );

  const mutation = useMutation({
    mutationFn: () => {
      const precoCusto = parseMoneyLike(custo);
      if (Number.isNaN(precoCusto) || precoCusto < 0) {
        throw new Error("Informe um custo válido.");
      }
      return updateSale(brechoId, saleId, { precoCusto });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales-period-summary", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["sales-missing-cost", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["item", brechoId, pecaId] });
      await queryClient.invalidateQueries({ queryKey: ["pending-sacolas", brechoId] });
      onSuccess?.();
    }
  });

  if (compact) {
    return (
      <div className="flex flex-wrap items-end gap-2">
        <Input
          type="number"
          step="0.01"
          min={0}
          placeholder="Quanto você pagou? (R$)"
          value={custo}
          onChange={(event) => setCusto(event.target.value)}
          className="min-w-[10rem] flex-1"
        />
        <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
        {mutation.isError && (
          <p className="w-full text-xs text-red-600">
            {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar."}
          </p>
        )}
      </div>
    );
  }

  return (
    <article className="rounded-2xl border border-rose-50 bg-white p-3">
      <div className="flex items-start gap-3">
        {pecaThumbnailUrl ? (
          <img
            src={pecaThumbnailUrl}
            alt={`Foto da peça ${pecaNome}`}
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-xs text-outline">
            Sem foto
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link to={`/pecas/${pecaId}`} className="text-sm font-bold text-gray-900 hover:text-primary">
            {pecaCodigo ? `${pecaCodigo} · ` : ""}
            {pecaNome}
          </Link>
          <p className="text-xs text-gray-500">
            Vendido por {formatCurrency(precoVenda)}
            {clienteNome ? ` · ${clienteNome}` : ""}
            {criadoEm ? ` · ${new Date(criadoEm).toLocaleDateString("pt-BR")}` : ""}
          </p>
          {pecaPrecoCusto != null && initialPrecoCusto == null && (
            <p className="mt-1 text-xs text-gray-500">
              Custo no cadastro: {formatCurrency(pecaPrecoCusto)} — você pode copiar
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <Input
              type="number"
              step="0.01"
              min={0}
              placeholder="Quanto você pagou? (R$)"
              value={custo}
              onChange={(event) => setCusto(event.target.value)}
              className="min-w-[10rem] flex-1"
            />
            <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          {mutation.isError && (
            <p className="mt-1 text-xs text-red-600">
              {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar."}
            </p>
          )}
        </div>
      </div>
    </article>
  );
};
