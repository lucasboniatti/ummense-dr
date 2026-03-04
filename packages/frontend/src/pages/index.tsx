import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Synkra Local Frontend</h1>
      <p>Ambiente local para validação de integração frontend + backend.</p>
      <ul>
        <li>
          <Link href="/dashboard/webhooks/local">
            Abrir fluxo crítico local de Webhooks
          </Link>
        </li>
      </ul>
    </main>
  );
}
