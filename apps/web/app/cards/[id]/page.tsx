import { CardDetails } from "@/components/card-details";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CardDetails id={id} />;
}
