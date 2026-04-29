import { Link } from "react-router-dom";
import { AppShell, Section } from "../components/ui";

export const ItemCreateChoicePage = () => {
  return (
    <AppShell
      showTopBar
      showBottomNav
      activeTab="estoque"
      topBarTitle="Cadastrar"
      fabLink="/items/new/ai"
    >
      <section>
        <h1 className="mb-2 font-headline text-4xl font-extrabold tracking-tighter">Como cadastrar?</h1>
        <p className="text-sm text-on-surface-variant">Escolha um fluxo. Você pode voltar aqui pelo botão + do menu.</p>
      </section>

      <Section title="Uma peça">
        <p className="mb-3 text-sm text-on-surface-variant">
          Fotos de uma única peça, sugestão com IA e revisão rápida (fluxo atual).
        </p>
        <Link
          to="/items/new/ai"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
        >
          Cadastrar com IA
        </Link>
        <div className="mt-3">
          <Link to="/items/new/manual" className="text-sm font-bold text-primary underline">
            Cadastro manual
          </Link>
        </div>
      </Section>

      <Section title="Várias peças (importação)">
        <p className="mb-3 text-sm text-on-surface-variant">
          Selecione muitas fotos; a Anna sugere grupos por peça. Você revisa os grupos, depois os dados, e publica no estoque.
        </p>
        <Link
          to="/importacoes/criar"
          className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-primary bg-white px-4 text-sm font-bold text-primary"
        >
          Importar várias peças
        </Link>
        <div className="mt-3">
          <Link to="/importacoes" className="text-sm font-bold text-primary underline">
            Ver importações em andamento
          </Link>
        </div>
      </Section>
    </AppShell>
  );
};
