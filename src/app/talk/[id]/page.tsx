import { getBusiness } from "@/lib/business";
import { TalkShell } from "./shell";

export const dynamic = "force-dynamic";

export default async function TalkPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ embed?: string }> }) {
  const { id } = await params;
  const { embed } = await searchParams;
  try {
    const b = await getBusiness(id);
    return <TalkShell id={id} name={b.name} live={!!b.liveVersion} ready={b.latestVersion > 0} embed={embed === "1"} />;
  } catch {
    return (
      <main className="container" style={{ padding: "96px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem" }}>Number not found</h1>
        <p className="muted" style={{ marginTop: 8 }}>This line doesn&apos;t belong to any business on Pratihar.</p>
      </main>
    );
  }
}
