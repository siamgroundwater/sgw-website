import Image from 'next/image'
import '@/styles/globals.css'

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <head>
        <title>Siam Groundwater | Page not found</title>
        <meta
          name="description"
          content="Choose your preferred language to return to the Siam Groundwater website."
        />
      </head>
      <body className="antialiased min-h-screen">
        <main
          style={{
            width: 'min(760px, calc(100% - 2rem))',
            minHeight: '100vh',
            margin: '0 auto',
            padding: '5rem 0',
            display: 'grid',
            alignContent: 'center',
            justifyItems: 'center',
            textAlign: 'center',
          }}
        >
          <Image
            src="/logos/Logo.png"
            alt="Siam Groundwater"
            width={220}
            height={73}
            priority
            style={{ width: 'min(220px, 70vw)', height: 'auto' }}
          />
          <p
            style={{
              marginTop: '2rem',
              color: '#67e8f9',
              fontWeight: 800,
              letterSpacing: '0.12em',
            }}
          >
            404 · PAGE NOT FOUND
          </p>
          <h1 style={{ marginTop: '1rem', fontSize: 'var(--fs-fluid-heading-lg)' }}>
            We couldn&apos;t find this page
          </h1>
          <p
            style={{
marginTop: '1rem',
              color: 'rgba(255,255,255,.72)',
              lineHeight: 1.8,
            }}
          >
            The address may have changed. Choose your preferred language to return
            to the Siam Groundwater website.
          </p>
          <nav
            aria-label="Choose language"
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '.75rem',
              marginTop: '1.75rem',
            }}
          >
            {[
              ['ภาษาไทย', '/'],
              ['English', '/en'],
              ['简体中文', '/zh'],
              ['日本語', '/ja'],
            ].map(([label, href], index) => (
              <a
                key={href}
                href={href}
                style={{
                  padding: '.75rem 1.1rem',
                  borderRadius: '.75rem',
                  color: index === 0 ? '#052f38' : 'white',
                  background: index === 0 ? '#67e8f9' : 'transparent',
                  border: index === 0 ? '1px solid #67e8f9' : '1px solid rgba(255,255,255,.24)',
                  fontWeight: 800,
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        </main>
      </body>
    </html>
  )
}
