import { ThemeSelector } from "@/components/theme-selector";

export default function Page() {
  return (
    <>
      <header className="top">
        <h1>Configurações</h1>
      </header>
      <section className="card">
        <h2 className="section-title">Aparência</h2>
        <p>Tema claro, escuro ou conforme o sistema.</p>
        <ThemeSelector />
      </section>
    </>
  );
}
