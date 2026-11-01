import { requireBusiness } from "@/lib/auth";
import { fail, ok, route, type Ctx } from "@/lib/api";
import { addDocument, listDocuments, removeDocument, searchKnowledge } from "@/lib/knowledge";

const MAX = 5 * 1024 * 1024;

export const GET = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  await requireBusiness(id);
  const q = new URL(req.url).searchParams.get("q");
  if (q) return ok({ results: await searchKnowledge(id, q) });
  return ok({ documents: await listDocuments(id) });
});

export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  await requireBusiness(id);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Attach a file.");
  if (file.size > MAX) return fail("Keep files under 5 MB.", 413);
  try {
    return ok(await addDocument(id, file), { status: 201 });
  } catch (e) {
    return fail((e as Error).message, 422);
  }
});

export const DELETE = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  await requireBusiness(id);
  const file = new URL(req.url).searchParams.get("file");
  if (!file) return fail("Which file?");
  await removeDocument(id, file);
  return ok({ removed: file });
});
