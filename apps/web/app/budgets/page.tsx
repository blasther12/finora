import { ResourcePage } from "@/components/resource-page";
export default function Page() {
  const d = new Date();
  return (
    <ResourcePage
      title="Orçamentos"
      path={`/budgets/${d.getFullYear()}/${d.getMonth() + 1}`}
    />
  );
}
