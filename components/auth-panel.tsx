"use client";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { explain } from "@/lib/db";
export default function AuthPanel({
  db,
  mfa,
  onDone,
}: {
  db: SupabaseClient;
  mfa: boolean;
  onDone: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [factor, setFactor] = useState(""),
    [qr, setQr] = useState(""),
    [recovery, setRecovery] = useState(false);
  async function begin() {
    setBusy(true);
    setError("");
    try {
      const { data, error } = await db.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) {
        setFactor(verified.id);
      } else {
        for (const f of data.totp)
          if (f.status !== "verified")
            await db.auth.mfa.unenroll({ factorId: f.id });
        const { data: d, error: e } = await db.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Kozlu GSB",
        });
        if (e) throw e;
        setFactor(d.id);
        setQr(d.totp.qr_code);
      }
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (mfa) {
        const { error } = await db.auth.mfa.challengeAndVerify({
          factorId: factor,
          code: String(fd.get("code")),
        });
        if (error) throw error;
      } else if (recovery) {
        const { error } = await db.auth.resetPasswordForEmail(
          String(fd.get("email")),
          { redirectTo: location.origin + "/?reset=1" },
        );
        if (error) throw error;
        setError("Parola yenileme bağlantısı e-posta adresinize gönderildi.");
        return;
      } else {
        const { error } = await db.auth.signInWithPassword({
          email: String(fd.get("email")),
          password: String(fd.get("password")),
        });
        if (error) throw error;
      }
      onDone();
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-panel">
      <p className="eyebrow">PERSONEL ÇALIŞMA ALANI</p>
      <h2>{mfa ? "İki adımlı doğrulama" : "Tekrar hoş geldiniz"}</h2>
      <p className="muted">
        {mfa
          ? "Müdür ve yönetici erişimi için doğrulayıcı uygulamanızdaki kodu kullanın."
          : "Kurumunuz tarafından tanımlanan personel hesabıyla giriş yapın."}
      </p>
      {mfa && !factor ? (
        <Button onClick={begin} disabled={busy}>
          Doğrulamayı başlat
        </Button>
      ) : (
        <form onSubmit={submit}>
          {qr && (
            <>
              <img
                className="mfa-qr"
                src={qr}
                alt="Doğrulayıcı uygulamanızla okutun"
              />
              <p>Doğrulayıcı uygulamanızla bu kodu okutun.</p>
            </>
          )}
          {mfa ? (
            <Label>
              6 haneli kod
              <Input
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
                autoComplete="one-time-code"
              />
            </Label>
          ) : (
            <>
              <Label>
                E-posta
                <Input
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                />
              </Label>
              {!recovery && (
                <Label>
                  Parola
                  <Input
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </Label>
              )}
            </>
          )}
          <Button disabled={busy}>
            {busy
              ? "Kontrol ediliyor…"
              : mfa
                ? "Doğrula"
                : recovery
                  ? "Yenileme bağlantısı gönder"
                  : "Giriş yap"}
          </Button>
          {!mfa && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRecovery(!recovery)}
            >
              {recovery ? "Girişe dön" : "Parolamı unuttum"}
            </Button>
          )}
        </form>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
    </div>
  );
}
