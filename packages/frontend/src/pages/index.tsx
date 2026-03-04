import Link from 'next/link';

export default function HomePage() {
  const cards = [
    {
      href: '/dashboard/webhooks/local',
      title: 'Fluxo Crítico de Webhooks',
      description: 'Health do backend + listagem local/real com token JWT.',
    },
    {
      href: '/dashboard/webhooks',
      title: 'Gestão de Webhooks',
      description: 'Visão de listagem e ações de webhook no dashboard.',
    },
    {
      href: '/dashboard/automations',
      title: 'Automações',
      description: 'Histórico, DLQ e fluxos operacionais de execução.',
    },
    {
      href: '/admin/rate-limits',
      title: 'Admin: Rate Limits',
      description: 'Painel administrativo de limites de integração.',
    },
  ];

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
        background:
          'linear-gradient(145deg, #f4f8ff 0%, #ffffff 40%, #f9fff3 100%)',
        color: '#0f172a',
      }}
    >
      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            border: '1px solid #dbe7ff',
            borderRadius: 20,
            padding: 28,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 16px 48px rgba(9, 41, 91, 0.08)',
          }}
        >
          <p
            style={{
              display: 'inline-block',
              margin: 0,
              padding: '6px 12px',
              borderRadius: 999,
              background: '#dbeafe',
              color: '#1d4ed8',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.6,
            }}
          >
            SYNKRA PUBLIC VALIDATION HUB
          </p>

          <h1 style={{ fontSize: 44, margin: '12px 0 8px', lineHeight: 1.1 }}>
            Synkra Frontend Command Center
          </h1>

          <p
            style={{
              margin: 0,
              color: '#334155',
              fontSize: 18,
              maxWidth: 760,
            }}
          >
            Navegue pelos fluxos mais importantes para validar integração
            frontend + backend em ambiente local ou cloud.
          </p>
        </div>

        <div
          style={{
            marginTop: 22,
            display: 'grid',
            gap: 14,
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          }}
        >
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              style={{ textDecoration: 'none' }}
            >
              <article
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: 18,
                  minHeight: 152,
                  background: '#ffffff',
                  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
                  cursor: 'pointer',
                }}
              >
                <h2
                  style={{
                    fontSize: 20,
                    margin: '0 0 8px',
                    color: '#0f172a',
                    lineHeight: 1.2,
                  }}
                >
                  {card.title}
                </h2>
                <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>
                  {card.description}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
