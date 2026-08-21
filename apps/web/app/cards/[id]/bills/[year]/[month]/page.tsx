import { BillDetails } from "@/components/bill-details";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; year: string; month: string }>;
}) {
  const { id, year, month } = await params;
  return <BillDetails cardId={id} year={year} month={month} />;
}
