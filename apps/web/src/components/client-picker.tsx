import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ClientRow } from "../api/clients";
import { searchClients } from "../api/clients";
import { Button, Input } from "./ui";

export type ClientContact = {
  nome: string;
  whatsapp: string;
  instagram: string;
};

const digitsOnly = (value: string): string => value.replace(/\D/g, "");

export const guessClientContactFromSearch = (search: string): ClientContact => {
  const raw = search.trim();
  const digits = digitsOnly(raw);
  const instagram = raw.replace(/^@+/, "").trim();

  if (digits.length >= 8 && digits.length >= raw.replace(/\s/g, "").length - 2) {
    return { nome: "", whatsapp: digits, instagram: "" };
  }

  if (raw.startsWith("@")) {
    return { nome: "", whatsapp: "", instagram };
  }

  return { nome: raw, whatsapp: "", instagram: "" };
};

const displayInstagram = (instagram: string | null | undefined) => {
  if (!instagram) {
    return "Instagram não informado";
  }
  return `Instagram @${instagram.replace(/^@+/, "")}`;
};

const displayWhatsapp = (whatsapp: string | null | undefined) => {
  if (!whatsapp) {
    return "WhatsApp não informado";
  }
  return `WhatsApp ${whatsapp}`;
};

const contactFromClient = (client: ClientRow): ClientContact => ({
  nome: client.nome,
  whatsapp: client.whatsapp ?? "",
  instagram: client.instagram ?? ""
});

const hasSelectedContact = (contact?: ClientContact | null) =>
  Boolean(contact?.nome.trim() || contact?.whatsapp.trim() || contact?.instagram.trim());

export const ClientPicker = ({
  brechoId,
  selectedContact,
  onSelect,
  onCreateNew,
  onClear,
  title = "Cliente"
}: {
  brechoId: string;
  selectedContact?: ClientContact | null;
  onSelect: (contact: ClientContact) => void;
  onCreateNew: (contact: ClientContact) => void;
  onClear?: () => void;
  title?: string;
}) => {
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim();
  const canSearch = trimmedSearch.length >= 2;

  const clientsQuery = useQuery({
    queryKey: ["clients-search", brechoId, trimmedSearch, 5],
    queryFn: () => searchClients(brechoId, trimmedSearch, { limit: 5 }),
    enabled: canSearch && !hasSelectedContact(selectedContact)
  });

  if (hasSelectedContact(selectedContact)) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{title} selecionado</p>
            <strong className="block text-base text-gray-900">{selectedContact?.nome || "Nome não informado"}</strong>
          </div>
          {onClear && (
            <button type="button" className="text-sm font-bold text-primary" onClick={onClear}>
              Trocar
            </button>
          )}
        </div>
        <div className="grid gap-1 text-sm text-on-surface-variant">
          <span>{displayWhatsapp(selectedContact?.whatsapp)}</span>
          <span>{displayInstagram(selectedContact?.instagram)}</span>
        </div>
      </div>
    );
  }

  const createContact = guessClientContactFromSearch(trimmedSearch);

  return (
    <div className="grid gap-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
          Buscar por nome, WhatsApp ou Instagram
        </label>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Digite nome, telefone ou @instagram"
          className="h-14 w-full rounded-2xl text-base"
        />
      </div>

      {clientsQuery.isFetching && <p className="text-sm text-on-surface-variant">Buscando clientes parecidos...</p>}

      {canSearch && Boolean(clientsQuery.data?.length) && (
        <div className="grid gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Clientes parecidos</p>
          {clientsQuery.data?.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => {
                onSelect(contactFromClient(client));
                setSearch("");
              }}
              className="rounded-2xl border border-rose-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
            >
              <strong className="block text-base text-gray-900">{client.nome}</strong>
              <span className="mt-2 block text-sm text-on-surface-variant">{displayWhatsapp(client.whatsapp)}</span>
              <span className="block text-sm text-on-surface-variant">{displayInstagram(client.instagram)}</span>
              <span className="mt-3 inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-primary">
                Selecionar cliente
              </span>
            </button>
          ))}
        </div>
      )}

      {canSearch && !clientsQuery.isFetching && clientsQuery.data?.length === 0 && (
        <p className="rounded-2xl border border-rose-100 bg-white p-4 text-sm text-on-surface-variant">
          Nenhum cliente parecido encontrado.
        </p>
      )}

      {canSearch && (
        <Button
          type="button"
          className="h-auto min-h-11 !bg-white py-3 !text-primary ring-1 ring-rose-100"
          onClick={() => {
            onCreateNew(createContact);
            setSearch("");
          }}
        >
          Não é nenhuma dessas pessoas? Cadastrar novo cliente
        </Button>
      )}
    </div>
  );
};
