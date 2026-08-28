import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SITE_NAME, SITE_URL } from '@/lib/utils';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} – Agricultural Marketplace`,
    template: `%s | ${SITE_NAME}`
  },
  description:
    'A trusted agricultural marketplace connecting buyers directly with verified Nigerian farmers, distributors, and agro-businesses.',
  metadataBase: new URL(SITE_URL)
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
