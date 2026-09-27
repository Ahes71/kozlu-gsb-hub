process.on("uncaughtException", (e) => {
  console.error(e.message, e.code, e.detail, e.where);
  process.exit(1);
});
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite({ extensions: { pgcrypto, btree_gist } });
let passed = 0;
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;grant usage on schema auth to authenticated,anon;grant execute on all functions in schema auth to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,name text,bucket_id text,owner_id text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;`,
);
for (const file of [
  "001_schema.sql",
  "002_reports_storage.sql",
  "005_decision_support.sql",
])
  await db.exec(
    await readFile(new URL("../supabase/" + file, import.meta.url), "utf8"),
  );
const id = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const org = id(1),
  other = id(2),
  director = id(11),
  staff = id(12),
  outsider = id(13),
  member = id(21),
  sm = id(22),
  om = id(23),
  facility = id(31),
  of = id(32),
  ev = id(41),
  ot = id(42),
  task = id(51);
await db.exec(
  `insert into auth.users values('${director}','director@test.invalid'),('${staff}','staff@test.invalid'),('${outsider}','other@test.invalid');insert into organizations(id,slug,name) values('${org}','kozlu-gsb','Test Kozlu'),('${other}','test-other','Test Diğer');insert into memberships(id,organization_id,user_id,name,role) values('${member}','${org}','${director}','Test Müdür','director'),('${sm}','${org}','${staff}','Test Personel','staff'),('${om}','${other}','${outsider}','Test Diğer','director');insert into facilities(id,organization_id,name,is_public) values('${facility}','${org}','Test Salon',true),('${of}','${other}','Diğer Salon',false);insert into events(id,organization_id,name,category,starts_at,ends_at,facility_id,responsible_id,capacity,is_public) values('${ev}','${org}','Test etkinlik','Spor',now()-interval '30 minutes',now()+interval '1 hour','${facility}','${sm}',25,true),('${ot}','${other}','Özel etkinlik','Spor',now()-interval '30 minutes',now()+interval '1 hour','${of}','${om}',25,false);`,
);
async function identity(user, aal = "aal2") {
  await db.exec("reset role");
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [user || "", JSON.stringify({ aal })],
  );
  await db.exec(user ? "set role authenticated" : "set role anon");
}
async function test(label, fn) {
  await fn();
  passed++;
  console.log("PASS " + label);
}
async function denied(sql, params = []) {
  await assert.rejects(() => db.query(sql, params));
}
await identity(director);
await test("Tenant isolation: director sees only own events", async () =>
  assert.equal(
    (await db.query("select count(*)::int n from events")).rows[0].n,
    1,
  ));
await test("Cross-tenant write rejected", () =>
  denied(
    `insert into facilities(organization_id,name) values('${other}','Forbidden')`,
  ));
await test("Cross-tenant foreign key rejected", () =>
  denied(
    `insert into events(organization_id,name,category,starts_at,ends_at,facility_id,responsible_id,capacity) values('${org}','Wrong facility','Spor',now()+interval '1 day',now()+interval '2 days','${of}','${member}',10)`,
  ));
await test("Concurrent booking exclusion at database layer", () =>
  denied(
    `insert into events(organization_id,name,category,starts_at,ends_at,facility_id,responsible_id,capacity) values('${org}','Overlap','Spor',now(),now()+interval '30 minutes','${facility}','${member}',10)`,
  ));
await test("Negative attendance rejected", () =>
  denied("select set_attendance($1,-1)", [ev]));
await test("Task and checklist saved atomically", async () => {
  const d = {
    organization_id: org,
    name: "Test task",
    assigned_to: sm,
    due_at: new Date(Date.now() + 86400000).toISOString(),
    priority: "normal",
    status: "open",
    description: "",
  };
  const res = await db.query("select save_task($1::jsonb,$2::text[]) id", [
    JSON.stringify(d),
    ["Masa", "Afiş"],
  ]);
  globalThis.taskId = res.rows[0].id;
  assert.equal(
    (await db.query("select count(*)::int n from task_items")).rows[0].n,
    2,
  );
});
await identity(director, "aal1");
await test("MFA mandatory for manager data", async () =>
  assert.equal(
    (await db.query("select count(*)::int n from events")).rows[0].n,
    0,
  ));
await test("MFA enrolment can still read own membership", async () =>
  assert.equal(
    (await db.query("select count(*)::int n from memberships")).rows[0].n,
    1,
  ));
await identity(staff, "aal1");
await test("Staff cannot write inventory", () =>
  denied(
    `insert into inventory_items(organization_id,name,quantity) values('${org}','Forbidden',5)`,
  ));
await test("Staff can complete own checklist", async () => {
  const item = (await db.query("select id from task_items limit 1")).rows[0].id;
  await db.query("select toggle_task_item($1,true)", [item]);
  assert.equal(
    (await db.query("select done from task_items where id=$1", [item])).rows[0]
      .done,
    true,
  );
});
await test("Staff cannot reassign task or change deadline", () =>
  denied("update tasks set assigned_to=$1 where id=$2", [
    member,
    globalThis.taskId,
  ]));
await test("Incomplete checklist prevents task completion", () =>
  denied("update tasks set status='done' where id=$1", [globalThis.taskId]));
const pendingItems = (
  await db.query("select id from task_items where not done")
).rows;
for (const item of pendingItems)
  await db.query("select toggle_task_item($1,true)", [item.id]);
await test("Staff can update own task status", async () => {
  await db.query("update tasks set status='done' where id=$1", [
    globalThis.taskId,
  ]);
  assert.ok(
    (
      await db.query("select completed_at from tasks where id=$1", [
        globalThis.taskId,
      ])
    ).rows[0].completed_at,
  );
});
await test("Own event attendance correction is allowed", async () => {
  await db.query("select set_attendance($1,19)", [ev]);
  assert.equal(
    (
      await db.query(
        "select actual_attendance from event_statistics where event_id=$1",
        [ev],
      )
    ).rows[0].actual_attendance,
    19,
  );
});
await test("Staff cannot read audit or reports", async () => {
  assert.equal(
    (await db.query("select count(*)::int n from audit_logs")).rows[0].n,
    0,
  );
  await denied("select monthly_report($1,current_date)", [org]);
});
await identity(director);
const token = (
  await db.query("select attendance_token from events where id=$1", [ev])
).rows[0].attendance_token;
await db.query("update events set status='completed' where id=$1", [ev]);
await test("Monthly report uses approved attendance", async () => {
  const r = (await db.query("select monthly_report($1,current_date) r", [org]))
    .rows[0].r;
  assert.equal(r.events, 1);
  assert.equal(r.attendance, 19);
  assert.equal(r.tasks_completed, 1);
});
await test("Audit logs cannot be modified", () =>
  denied("update audit_logs set action='hidden'"));
await identity(null);
await test("Anonymous visitor cannot read raw events or staff", async () => {
  await denied("select * from events");
  await denied("select * from memberships");
});
await test("Public projection omits staff identities and private events", async () => {
  const p = (await db.query("select public_program('kozlu-gsb') p")).rows[0].p;
  assert.equal(p.events.length, 1);
  assert.ok(!("responsible_id" in p.events[0]));
  assert.ok(!("attendance_token" in p.events[0]));
});
await test("Duplicate QR scans count once", async () => {
  const args = ["attendance", "kozlu-gsb", token, id(71), "{}"];
  let r = (
    await db.query("select anonymous_submit($1,$2,$3,$4,$5::jsonb) r", args)
  ).rows[0].r;
  assert.equal(r.saved, true);
  r = (await db.query("select anonymous_submit($1,$2,$3,$4,$5::jsonb) r", args))
    .rows[0].r;
  assert.equal(r.duplicate, true);
});
await test("Invalid rating rolls back receipt", async () => {
  await denied("select anonymous_submit($1,$2,$3,$4,$5::jsonb)", [
    "feedback",
    "kozlu-gsb",
    token,
    id(72),
    JSON.stringify({ rating: 8, would_return: true }),
  ]);
  const r = (
    await db.query("select anonymous_submit($1,$2,$3,$4,$5::jsonb) r", [
      "feedback",
      "kozlu-gsb",
      token,
      id(72),
      JSON.stringify({ rating: 4, would_return: true, suggestion: "Test" }),
    ])
  ).rows[0].r;
  assert.equal(r.saved, true);
});
await test("Unknown QR token rejected", () =>
  denied("select anonymous_submit($1,$2,$3,$4,$5::jsonb)", [
    "attendance",
    "kozlu-gsb",
    id(999),
    id(74),
    "{}",
  ]));
await identity(director);
await test("QR count consistent after duplicate", async () =>
  assert.equal(
    (
      await db.query(
        "select qr_count from event_statistics where event_id=$1",
        [ev],
      )
    ).rows[0].qr_count,
    1,
  ));
await test("Decision support empty history does not invent trends", async () => {
  const r = (await db.query("select insights($1) r", [org])).rows[0].r;
  assert.equal(r.high_demand.length, 0);
  assert.equal(r.low_demand.length, 0);
});
await db.exec("reset role");
await db.exec(
  `insert into facilities(id,organization_id,name) values('${id(91)}','${org}','Trend Test');insert into events(organization_id,name,category,starts_at,ends_at,facility_id,responsible_id,capacity,status) select '${org}','Weekly','Spor',(date_trunc('week',now())-n*interval '1 week')+interval '12 hours',(date_trunc('week',now())-n*interval '1 week')+interval '13 hours','${id(91)}','${member}',100,'completed' from generate_series(1,4)n;update event_statistics set actual_attendance=95 where event_id in(select id from events where name='Weekly');`,
);
await identity(director);
await test("Four full high occupancy weeks produce suggestion", async () => {
  const r = (await db.query("select insights($1) r", [org])).rows[0].r;
  assert.equal(r.high_demand.length, 1);
  assert.equal(Number(r.high_demand[0].occupancy), 95);
});
console.log(`${passed} database integration tests passed.`);
await db.close();
