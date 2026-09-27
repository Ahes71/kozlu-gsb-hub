"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { dateText, labels, type Row } from "@/lib/model";
import { explain } from "@/lib/db";
export default function ResourceDetail({
  db,
  row,
  inventory,
  onClose,
  onEdit,
  editable,
}: {
  db: SupabaseClient;
  row: Row;
  inventory: boolean;
  onClose: () => void;
  onEdit: () => void;
  editable: boolean;
}) {
  const [data, setData] = useState<Record<string, Row[]>>({}),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      const entries = inventory
        ? ["inventory_movements"]
        : ["events", "maintenance_tickets", "inventory_items"];
      const result = await Promise.all(
        entries.map(async (table) => {
          const q = db
            .from(table)
            .select("*")
            .eq("organization_id", row.organization_id)
            .eq(inventory ? "item_id" : "facility_id", row.id)
            .order("created_at", { ascending: false })
            .limit(100);
          const { data, error } = await q;
          if (error) throw error;
          return [table, data] as const;
        }),
      );
      if (active) setData(Object.fromEntries(result));
    })().catch((e) => {
      if (active) setError(explain(e));
    });
    return () => {
      active = false;
    };
  }, [db, row, inventory]);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="detail-dialog">
        <DialogHeader>
          <DialogTitle>{row.name}</DialogTitle>
          <DialogDescription>
            {inventory
              ? "Malzeme durumu ve hareket geçmişi"
              : "Tesis programı, ekipman ve bakım kayıtları"}
          </DialogDescription>
        </DialogHeader>
        <p>{row.description || "Not eklenmemiş."}</p>
        <span className="badge">
          {labels[row.status || row.condition]}{" "}
          {inventory ? "· " + row.quantity + " adet" : ""}
        </span>
        {error && <p className="error">{error}</p>}
        {Object.entries(data).map(([table, records]) => (
          <section key={table}>
            <h3>
              {
                {
                  events: "Faaliyetler",
                  maintenance_tickets: "Bakım ve arıza",
                  inventory_items: "Malzemeler",
                  inventory_movements: "Hareket geçmişi",
                }[table]
              }
            </h3>
            {records.length ? (
              records.map((r) => (
                <div className="resource-row" key={r.id}>
                  {inventory ? (
                    <>
                      <strong>{dateText(r.created_at)}</strong>
                      <p>
                        {r.before_data
                          ? `Önce: ${r.before_data.quantity} adet / ${labels[r.before_data.condition]}`
                          : "İlk kayıt"}{" "}
                        → {r.after_data.quantity} adet /{" "}
                        {labels[r.after_data.condition]}
                      </p>
                      <small>İşlemi yapan: {r.actor_id || "Kurulum"}</small>
                    </>
                  ) : (
                    <>
                      <strong>{r.name}</strong>
                      <span>
                        {r.starts_at
                          ? dateText(r.starts_at)
                          : r.quantity !== undefined
                            ? r.quantity + " adet"
                            : dateText(r.created_at)}
                      </span>
                      <small>{labels[r.status || r.condition]}</small>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="muted small">Kayıt yok.</p>
            )}
            {records.length === 100 && (
              <p className="muted small">En güncel 100 kayıt gösteriliyor.</p>
            )}
          </section>
        ))}
        {editable && (
          <Button onClick={onEdit}>
            Düzenle / {inventory ? "tesise ata" : "not ekle"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
