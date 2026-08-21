import { ResourcePage } from "@/components/resource-page";
export default function Page() {
  return (
    <ResourcePage
      title="Orçamentos"
      path="/budgets/current"
      resource="budgets"
      refreshIntervalMs={60_000}
    />
  );
}
