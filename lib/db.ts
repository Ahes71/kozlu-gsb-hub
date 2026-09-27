import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export type Config = { url: string; key: string; slug: string };
export function client(config: Config) {
  return createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
export function explain(error: unknown) {
  const e = error as { message?: string; code?: string };
  if (e.code === "23P01")
    return "Bu tesis seçilen saatlerde dolu. Başka bir saat veya alan seçin.";
  if (e.code === "23503")
    return "İlişkili kayıt bulunamadı veya başka kuruma ait.";
  if (e.code === "42501")
    return "Bu işlem için yetkiniz yok. Yöneticiyseniz iki adımlı doğrulamayı tamamlayın.";
  return e.message || "İşlem tamamlanamadı. Tekrar deneyin.";
}
export async function rows(db: SupabaseClient, table: string, org: string) {
  let all: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .eq("organization_id", org)
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    all = all.concat(data);
    if (data.length < 500) return all;
  }
}
export async function rpc(
  db: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}
