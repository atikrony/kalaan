import './globals.css';
import { Suspense } from 'react';
import { Plus_Jakarta_Sans, Hanken_Grotesk } from 'next/font/google';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { all, byIdDesc } from '@/lib/store';
import TopBar from '@/components/TopBar';

const head = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-head', weight: ['500', '600', '700', '800'] });
const body = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600', '700'] });

export const metadata = { title: 'Kalaan ERP', description: 'Pre-order management — Malaysia → Bangladesh' };
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#2563eb' };

export default async function Layout({ children }) {
  const u = await getUser();
  // Valid cookie but the account was deleted/disabled → sign them out.
  if (!u && (await cookies()).get('auth')) redirect('/api/logout');
  const ships = u ? (await all('shipments')).sort(byIdDesc).map(({ id, name, status }) => ({ id, name, status })) : [];
  return (
    <html lang="en" className={`${head.variable} ${body.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} /></head>
      <body>
        {u && <Suspense><TopBar user={u} ships={ships} /></Suspense>}
        {u ? <main className="main">{children}</main> : children}
        {u && <footer className="foot"><span>Kalaan ERP — Unit accounting & procurement</span><span>Malaysia → Bangladesh pre-orders</span></footer>}
      </body>
    </html>
  );
}
