import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  readInventoryPrefs,
  SOLD_WITHIN_DAYS_OPTIONS,
  writeInventoryPrefs
} from "../lib/inventory-prefs";
import { useSessionStore } from "../store/session.store";
import { AppShell, Button, Field, Section } from "../components/ui";

export const AccountPreferencesPage = () => {
  const queryClient = useQueryClient();
  const brechoId = useSessionStore((state) => state.brechoId);
  const isFounder = useSessionStore((state) => state.user?.isFounder);
  const [soldWithinDays, setSoldWithinDays] = useState<number>(30);
  const [saved, setSaved] = useState(false);

  const backTo = isFounder ? "/admin/brechos" : "/relatorios";

  useEffect(() => {
    if (!brechoId) {
      return;
    }
    setSoldWithinDays(readInventoryPrefs(brechoId).soldWithinDays);
  }, [brechoId]);

  const onSave = () => {
    if (!brechoId) {
      return;
    }
    writeInventoryPrefs(brechoId, { soldWithinDays });
    void queryClient.invalidateQueries({ queryKey: ["items", brechoId] });
    setSaved(true);
  };

  return (
    <AppShell showTopBar topBarTitle="Preferências">
      <Link to={backTo} className="text-sm font-semibold text-on-surface-variant underline">
        ← Voltar
      </Link>

      <Section title="Estoque">
        <p className="mb-4 text-sm text-on-surface-variant">
          Define por quanto tempo peças vendidas ou entregues continuam visíveis no estoque quando você marca esses
          filtros. Isso é apenas visual — nada é apagado do sistema, e relatórios ou vendas não são afetados.
        </p>

        <Field label="Ocultar vendidos após">
          <select
            value={soldWithinDays}
            onChange={(event) => {
              setSoldWithinDays(Number(event.target.value));
              setSaved(false);
            }}
            className="h-12 w-full rounded-2xl border border-rose-100 bg-white px-4 text-base text-on-background"
          >
            {SOLD_WITHIN_DAYS_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {days} dias
              </option>
            ))}
          </select>
        </Field>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={onSave}>
            Salvar preferências
          </Button>
          {saved ? <span className="text-sm font-semibold text-green-700">Preferências salvas.</span> : null}
        </div>
      </Section>

      <Section title="Conta">
        <Link to="/conta/senha" className="inline-flex text-sm font-bold text-primary underline">
          Trocar senha
        </Link>
      </Section>
    </AppShell>
  );
};
