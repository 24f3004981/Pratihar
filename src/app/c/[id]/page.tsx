import { redirect } from "next/navigation";

// Short, shareable call link: /c/ab12cd34 -> the business's call page.
export default async function Short({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/talk/${encodeURIComponent(id)}`);
}
