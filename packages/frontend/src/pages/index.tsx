import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="p-6 font-sans space-y-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">Synkra Local Frontend</h1>
        <p className="text-neutral-700">Ambiente local para validação de integração frontend + backend.</p>
      </div>
      <ul className="space-y-2">
        <li>
          <Link href="/dashboard/webhooks/local" className="text-primary-600 hover:text-primary-700 hover:underline font-semibold">
            Abrir fluxo crítico local de Webhooks
          </Link>
        </li>
      </ul>
    </main>
  );
}
