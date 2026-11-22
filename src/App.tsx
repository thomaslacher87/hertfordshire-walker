import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';

const foundationCards = [
  {
    eyebrow: 'Discover',
    title: 'Find the right walk',
    copy: 'Search and filters will make the full catalogue easy to explore in Stage 3.',
  },
  {
    eyebrow: 'Plan',
    title: 'Know before you go',
    copy: 'Distance, terrain, parking and transport facts will sit in one calm view.',
  },
  {
    eyebrow: 'Explore',
    title: 'See walks on a map',
    copy: 'A reliable, clustered map and nearby search arrive in Stage 4.',
  },
] as const;

function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Hertfordshire Walker home">
        <span className="brand-mark" aria-hidden="true">
          HW
        </span>
        <span>
          <strong>Hertfordshire Walker</strong>
          <small>Country walks, clearly planned</small>
        </span>
      </Link>
      <span className="stage-pill">Foundation preview</span>
    </header>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-frame">
      <SiteHeader />
      {children}
      <footer className="site-footer">
        <p>Built carefully, one dependable stage at a time.</p>
      </footer>
    </div>
  );
}

function HomePage() {
  return (
    <Layout>
      <main>
        <section className="hero">
          <div className="hero-text">
            <p className="eyebrow">A cleaner way into the countryside</p>
            <h1>Walks worth looking forward to.</h1>
            <p className="hero-copy">
              A calm, practical guide to Hertfordshire walks is being rebuilt
              from the ground up. The current live catalogue stays available
              while this foundation is completed.
            </p>
            <div className="hero-actions">
              <a
                className="button button-primary"
                href="https://thomaslacher87.github.io/hertfordshire-walker/"
              >
                Open the current catalogue
              </a>
              <a className="button button-secondary" href="#foundation">
                See what comes next
              </a>
            </div>
          </div>
          <aside className="landscape-card" aria-label="Foundation status">
            <span className="sun" aria-hidden="true" />
            <div className="hill hill-back" aria-hidden="true" />
            <div className="hill hill-front" aria-hidden="true" />
            <div className="path" aria-hidden="true" />
            <p>
              <strong>Stage 1</strong>
              Maintainable source, dependable builds and Pages-ready routing.
            </p>
          </aside>
        </section>

        <section className="foundation-section" id="foundation">
          <div className="section-heading">
            <p className="eyebrow">The new foundation</p>
            <h2>Useful in the field. Simple at home.</h2>
          </div>
          <div className="card-grid">
            {foundationCards.map((card) => (
              <article className="feature-card" key={card.title}>
                <p className="card-eyebrow">{card.eyebrow}</p>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}

function WalkPlaceholderPage() {
  const { slug } = useParams();

  return (
    <Layout>
      <main className="route-page">
        <p className="eyebrow">Deep-link preview</p>
        <h1>Walk {slug}</h1>
        <p>
          This route is ready for the catalogue migration in Stage 2. Reloading
          this URL directly verifies the GitHub Pages fallback.
        </p>
        <Link className="text-link" to="/">
          Return to the foundation
        </Link>
      </main>
    </Layout>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/walk/:slug" element={<WalkPlaceholderPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
