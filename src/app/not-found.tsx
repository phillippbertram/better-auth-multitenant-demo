import Link from "next/link";

export default function NotFound() {
  return (
    <main className="error-state">
      <section className="error-state__card" aria-labelledby="not-found-title">
        <span className="error-state__icon" aria-hidden="true">
          404
        </span>
        <h1 id="not-found-title">Page not found</h1>
        <p>
          The requested page does not exist or is no longer available.
        </p>
        <Link href="/" className="error-state__button">
          Return home
        </Link>
      </section>
    </main>
  );
}
