import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";
const links = [
  ["/dashboard", "Dashboard"],
  ["/transactions", "Transações"],
  ["/accounts", "Contas"],
  ["/cards", "Cartões"],
  ["/recurring", "Recorrências"],
  ["/installments", "Parcelas"],
  ["/people", "Pessoas"],
  ["/budgets", "Orçamentos"],
  ["/projections", "Projeções"],
  ["/goals", "Metas"],
  ["/settings", "Configurações"],
];
export const metadata = {
  title: "Finora",
  description: "Seu estado financeiro, com clareza",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="shell">
            <aside className="side">
              <div className="logo">
                Fin<span>ora</span>
              </div>
              <nav className="nav">
                {links.map(([h, l]) => (
                  <Link key={h} href={h}>
                    {l}
                  </Link>
                ))}
              </nav>
            </aside>
            <main className="main">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
