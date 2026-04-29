import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { SplashScreen } from '@/components/layout/SplashScreen';

export const viewport: Viewport = {
  themeColor: '#FF4B4B',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'EvacuAid — Emergency Response System',
    template: '%s — EvacuAid',
  },
  description: 'Emergency response system for Tagum City, Davao del Norte, Philippines.',
  keywords: ['emergency', 'SOS', 'Tagum City', 'emergency response', 'DRRMO', 'evacuation', 'Philippines'],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'EvacuAid',
    description: 'Emergency response system for Tagum City, Davao del Norte, Philippines.',
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body
        className="antialiased min-h-[100dvh] bg-[var(--bg-base)] text-[var(--text-primary)]"
        suppressHydrationWarning
      >
        <SplashScreen />
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
