import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NodeLink Security Posture Scanner',
  description:
    'Lightweight external security assessment for small businesses. By NodeLink Technologies.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <header className="mb-10 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: '#844EEE' }}
              />
              NodeLink <span className="text-ink-muted font-normal">/ Posture Scanner</span>
            </a>
            <nav className="text-sm text-ink-muted">
              <a href="/scans" className="hover:text-accent">Recent scans</a>
            </nav>
          </header>
          {children}
          <footer className="mt-20 border-t border-[var(--border)] pt-6 text-xs text-ink-muted">
            © {new Date().getFullYear()} NodeLink Technologies LLC · Lightweight external
            assessment, not a penetration test.
          </footer>
        </div>
      </body>
    </html>
  );
}