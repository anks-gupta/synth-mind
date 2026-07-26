import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'SynthMind - AI-Powered Research Assistant',
  description:
    'Synthesize any source into instant understanding. Multi-notebook workspace, source-backed chat, deep-linked citations, and sequential study roadmaps.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark ${inter.variable}`}>
        <body className="font-inter bg-[#070b12] text-slate-100 min-h-screen antialiased selection:bg-violet-500/30 selection:text-violet-200">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
