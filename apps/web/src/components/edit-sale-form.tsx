import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { updateSale } from "../api/items";
import { Button, Field, Input } from "./ui";
import { parseMoneyLike } from "../lib/money";

type EditSaleFormProps = {
  brechoId: string;
  saleId: string;
  pecaNome: string;
  initialPreco: number;
  initialFreteIncluso: boolean;
  canEditFreteIncluso: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const EditSaleForm = ({
  brechoId,
  saleId,
  pecaNome,
  initialPreco,
  initialFreteIncluso,
  canEditFreteIncluso,
  onClose,
  onSuccess
}: EditSaleFormProps) => {
  const queryClient = useQueryClient();
  const [preco, setPreco] = useState(String(initialPreco));
  const [freteIncluso, setFreteIncluso] = useState(initialFreteIncluso);

  const mutation = useMutation({
    mutationFn: () => {
      const precoVenda = parseMoneyLike(preco);
      if (Number.isNaN(precoVenda) || precoVenda <= 0) {
        throw new Error("Informe um preço válido.");
      }
      return updateSale(brechoId, saleId, {
        precoVenda,
        ...(canEditFreteIncluso ? { freteIncluso } : {})
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pending-sacolas", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["sales-period-summary", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["client", brechoId] });
      onSuccess?.();
      onClose();
    }
  });

  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-lg">
      <h4 className="mb-1 font-bold text-gray-900">Editar venda</h4>
      <p className="mb-4 text-sm text-gray-500">{pecaNome}</p>
      <div className="space-y-4">
        <Field label="Preço (R$)">
          <Input type="number" step="0.01" min={0} value={preco} onChange={(e) => setPreco(e.target.value)} />
        </Field>
        {canEditFreteIncluso && (
          <Field label="Frete no preço?">
            <div className="flex gap-2">
              <Button
                type="button"
                className={freteIncluso ? "" : "bg-zinc-200 text-gray-800"}
                onClick={() => setFreteIncluso(true)}
              >
                Sim
              </Button>
              <Button
                type="button"
                className={!freteIncluso ? "" : "bg-zinc-200 text-gray-800"}
                onClick={() => setFreteIncluso(false)}
              >
                Não
              </Button>
            </div>
          </Field>
        )}
        {!canEditFreteIncluso && (
          <p className="text-xs text-amber-700">Peça já entregue: só o preço pode ser ajustado.</p>
        )}
        {mutation.isError && (
          <p className="text-sm text-red-600">
            {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar."}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" className="bg-zinc-200 text-gray-800" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};
