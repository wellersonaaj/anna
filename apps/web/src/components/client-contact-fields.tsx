import { isClientContactComplete, isClientContactEnriched, missingContactChannel } from "@anna/shared";
import { Button, Field, Input } from "./ui";

export type ClientContactValues = {
  nome: string;
  whatsapp: string;
  instagram: string;
};

export { isClientContactComplete, isClientContactEnriched, missingContactChannel };

type Props = {
  values: ClientContactValues;
  onChange: (field: keyof ClientContactValues, value: string) => void;
  errors?: Partial<Record<keyof ClientContactValues, string>>;
  dismissedNudge?: boolean;
  onDismissNudge?: () => void;
};

export const ClientContactFields = ({ values, onChange, errors, dismissedNudge, onDismissNudge }: Props) => {
  const missing = missingContactChannel(values);
  const showNudge = !dismissedNudge && isClientContactComplete(values) && missing !== null;

  return (
    <div className="grid gap-3">
      {showNudge && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">
            {missing === "whatsapp"
              ? "Tem o WhatsApp dela? Responde mais rápido que DM."
              : "Instagram ajuda a reconhecer a cliente depois."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              className="!h-9 !min-h-0 !px-4 !py-0 text-xs"
              onClick={() => {
                const id = missing === "whatsapp" ? "client-whatsapp" : "client-instagram";
                document.getElementById(id)?.focus();
              }}
            >
              Adicionar
            </Button>
            {onDismissNudge && (
              <button type="button" className="text-xs font-bold text-amber-800 underline" onClick={onDismissNudge}>
                Continuar assim
              </button>
            )}
          </div>
        </div>
      )}
      <Field label="Nome completo">
        <Input
          id="client-nome"
          value={values.nome}
          onChange={(e) => onChange("nome", e.target.value)}
          placeholder="ex: Elena Rossi"
        />
        {errors?.nome && <small className="text-red-600">{errors.nome}</small>}
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="WhatsApp">
          <Input
            id="client-whatsapp"
            type="tel"
            value={values.whatsapp}
            onChange={(e) => onChange("whatsapp", e.target.value)}
            placeholder="55 11 99999-9999"
          />
          {errors?.whatsapp && <small className="text-red-600">{errors.whatsapp}</small>}
        </Field>
        <Field label="Instagram">
          <Input
            id="client-instagram"
            value={values.instagram}
            onChange={(e) => onChange("instagram", e.target.value)}
            placeholder="@usuario"
          />
          {errors?.instagram && <small className="text-red-600">{errors.instagram}</small>}
        </Field>
      </div>
    </div>
  );
};
