import { requireBusiness } from "@/lib/auth";
import { fail, ok, route, type Ctx } from "@/lib/api";
import { createVersion } from "@/lib/business";
import { cardGaps, extractCard } from "@/lib/interview";

export const POST = route(async (_: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  const { business: b } = await requireBusiness(id);
  const said = b.interview.filter((t) => t.role === "owner");
  // Two interview answers, or one decent paragraph from the "Type it" box on the home page.
  if (said.length < 2 && said.reduce((n, t) => n + t.text.length, 0) < 60)
    return fail("Tell Pratihar a little more about the business first.", 409);
  const card = await extractCard(b.interview, b.card);
  const version = await createVersion(id, card, b.card ? "Rebuilt from interview" : "First job card", b.latestVersion || null);
  return ok({ card, version: version.n, gaps: cardGaps(card) });
});
