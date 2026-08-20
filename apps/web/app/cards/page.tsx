import { ResourcePage } from "@/components/resource-page";
export default function Page() {
  return (
    <ResourcePage
      title="Cartões"
      path="/credit-cards"
      resource="cards"
      detailPath="/cards"
    />
  );
}
