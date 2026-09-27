"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main>
      <h1>Sayfa şu an açılamıyor.</h1>
      <p>
        Kayıtlarınız veritabanında korunur. Bağlantınızı kontrol edip tekrar
        deneyin.
      </p>
      <button onClick={reset}>Tekrar dene</button>
      <p>
        <a href="/">Ana ekrana dön</a>
      </p>
    </main>
  );
}
