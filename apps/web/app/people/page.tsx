import { ResourcePage } from "@/components/resource-page";
export default function Page() {
  return (
    <ResourcePage
      title="Pessoas"
      path="/people"
      resource="people"
      detailPath="/people"
    />
  );
}
