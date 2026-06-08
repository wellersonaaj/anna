import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { updateSale } from "../api/items";
import {
  FreteInclusoDetail,
  parseFreteInclusoValorForApi,
  validateFreteInclusoValor
} from "./frete-incluso-detail";
import { Button, Field, Input } from "./ui";
import { parseMoneyLike } from "../lib/money";

type EditSaleFormProps = {
  brechoId: string;
  saleId: string;
  pecaNome: string;
  initialPreco: number;
  initialPrecoCusto?: number | null;
  initialFreteIncluso: boolean;
  initialFreteInclusoValor?: number | null;
  canEditFreteIncluso: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export const EditSaleForm = ({
  brechoId,
  saleId,
  pecaNome,
  initialPreco,
  initialPrecoCusto,
  initialFreteIncluso,
  initialFreteInclusoValor,
  canEditFreteIncluso,
  onClose,
  onSuccess
}: EditSaleFormProps) => {
  const queryClient = useQueryClient();
  const [preco, setPreco] = useState(String(initialPreco));
  const [precoCusto, setPrecoCusto] = useState(
    initialPrecoCusto != null ? String(initialPrecoCusto) : ""
  );
  const [freteIncluso, setFreteIncluso] = useState(initialFreteIncluso);
  const [freteInclusoValor, setFreteInclusoValor] = useState(
    initialFreteInclusoValor ? String(initialFreteInclusoValor) : ""
  );
  const [freteValidationError, setFreteValidationError] = useState<string | null>(null);

  const precoNum = parseMoneyLike(preco);
  const precoValid = !Number.isNaN(precoNum) && precoNum > 0;

  const mutation = useMutation({
    mutationFn: () => {
      const precoVenda = parseMoneyLike(preco);
      if (Number.isNaN(precoVenda) || precoVenda <= 0) {
        throw new Error("Informe um preço válido.");
      }

      const showFreteDetail = freteIncluso && (canEditFreteIncluso || initialFreteIncluso);
      if (showFreteDetail) {
        const freteError = validateFreteInclusoValor(precoVenda, freteInclusoValor);
        if (freteError) {
          throw new Error(freteError);
        }
      }

      const parsedFrete = showFreteDetail
        ? parseFreteInclusoValorForApi(precoVenda, freteInclusoValor)
        : undefined;

      const custoTrim = precoCusto.trim();
      const parsedCusto = custoTrim ? parseMoneyLike(custoTrim) : null;
      if (custoTrim && (Number.isNaN(parsedCusto!) || parsedCusto! < 0)) {
        throw new Error("Informe um custo válido.");
      }

      return updateSale(brechoId, saleId, {
        precoVenda,
        ...(custoTrim ? { precoCusto: parsedCusto } : {}),
        ...(canEditFreteIncluso
          ? {
              freteIncluso,
              freteInclusoValor: freteIncluso ? (parsedFrete ?? null) : null
            }
          : initialFreteIncluso
            ? { freteInclusoValor: parsedFrete ?? null }
            : {})
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pending-sacolas", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["sales-period-summary", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["sales-missing-cost", brechoId] });
      await queryClient.invalidateQueries({ queryKey: ["client", brechoId] });
      onSuccess?.();
      onClose();
    }
  });

  const showFreteDetail = freteIncluso && (canEditFreteIncluso || initialFreteIncluso);

  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-lg">
      <h4 className="mb-1 font-bold text-gray-900">Editar venda</h4>
      <p className="mb-4 text-sm text-gray-500">{pecaNome}</p>
      <div className="space-y-4">
        <Field label="Preço (R$)">
          <Input type="number" step="0.01" min={0} value={preco} onChange={(e) => setPreco(e.target.value)} />
        </Field>
        <Field label="Quanto você pagou? (R$)">
          <Input
            type="number"
            step="0.01"
            min={0}
            placeholder="Opcional"
            value={precoCusto}
            onChange={(e) => setPrecoCusto(e.target.value)}
          />
        </Field>
        {canEditFreteIncluso && (
          <Field label="Frete no preço?">
            <div className="flex gap-2">
              <Button
                type="button"
                className={freteIncluso ? "" : "bg-zinc-200 text-gray-800"}
                onClick={() => {
                  setFreteIncluso(true);
                  setFreteValidationError(null);
                }}
              >
                Sim
              </Button>
              <Button
                type="button"
                className={!freteIncluso ? "" : "bg-zinc-200 text-gray-800"}
                onClick={() => {
                  setFreteIncluso(false);
                  setFreteInclusoValor("");
                  setFreteValidationError(null);
                }}
              >
                Não
              </Button>
            </div>
          </Field>
        )}
        {!canEditFreteIncluso && initialFreteIncluso && (
          <p className="text-xs text-amber-700">Peça já entregue: ajuste o preço e o frete incluso, se informado.</p>
        )}
        {!canEditFreteIncluso && !initialFreteIncluso && (
          <p className="text-xs text-amber-700">Peça já entregue: só o preço pode ser ajustado.</p>
        )}
        {showFreteDetail && precoValid && (
          <FreteInclusoDetail
            precoVenda={precoNum}
            freteInclusoValor={freteInclusoValor}
            onFreteInclusoValorChange={(value) => {
              setFreteInclusoValor(value);
              setFreteValidationError(validateFreteInclusoValor(precoNum, value));
            }}
          />
        )}
        {(freteValidationError || mutation.isError) && (
          <p className="text-sm text-red-600">
            {freteValidationError ??
              (mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar.")}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={mutation.isPending || Boolean(freteValidationError)}
            onClick={() => mutation.mutate()}
          >
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
