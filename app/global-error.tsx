"use client";
export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body style={{ fontFamily: "system-ui", padding: 40 }}>
        <h1>Bir sorun oluştu.</h1>
        <p>Sayfayı tekrar açabilirsiniz.</p>
        <button onClick={reset}>Tekrar dene</button>
      </body>
    </html>
  );
}
