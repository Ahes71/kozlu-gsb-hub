export const dynamic = "force-dynamic";
export async function GET() {
  const values = process.env;
  const url = values.SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key =
    values.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "";
  // Yalnız yayınlanabilir anahtar. Service-role hiçbir zaman tarayıcıya gönderilmez.
  let safe = false;
  try {
    if (key.startsWith("sb_publishable_")) safe = true;
    else if (key.split(".").length === 3)
      safe = JSON.parse(atob(key.split(".")[1])).role === "anon";
  } catch {}
  return Response.json(
    {
      url: safe ? url : "",
      key: safe ? key : "",
      slug: values.ORGANIZATION_SLUG || "kozlu-gsb",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
