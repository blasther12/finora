import { ProjectionChart } from "@/components/financial-charts";

export default function Page() {
  return (
    <>
      <header className="top">
        <div>
          <div className="label">Planejamento</div>
          <h1>Projeções</h1>
        </div>
      </header>
      <section className="card">
        <div className="chart-heading">
          <div>
            <h2 className="section-title">Fluxo financeiro futuro</h2>
            <p className="chart-description">
              Valores confirmados e projetados para os próximos doze meses.
            </p>
          </div>
          <span className="badge projected">Cenário base</span>
        </div>
        <ProjectionChart months={12} />
      </section>
    </>
  );
}
