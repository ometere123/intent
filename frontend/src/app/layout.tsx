import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'INTENT — Semantic Wallet Guard',
  description: 'Human intent as an enforceable wallet boundary, adjudicated on GenLayer Studionet 61999.',
};

const nav = [
  ['/', 'Overview'],
  ['/intents/new', 'New intent'],
  ['/analyse', 'Analyse transaction'],
  ['/activity', 'Activity'],
  ['/integrate', 'Integrate'],
  ['/settings', 'Settings'],
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brandmark">I</span><span>INTENT</span></Link>
      <div className="network"><div className="kicker">Adjudication network</div><div style={{marginTop:8,fontWeight:800}}><span className="dot"/>Studionet 61999</div><div className="mono muted" style={{marginTop:7}}>studio.genlayer.com/api</div></div>
      <nav className="nav">{nav.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav>
      <div className="sidefoot">Fail-closed semantic authorisation.<br/>No private keys. No hidden backend signer.</div>
    </aside>
    <main className="main">{children}</main>
  </div></body></html>;
}
