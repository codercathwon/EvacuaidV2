import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const viewport: Viewport = {
  themeColor: '#C0392B',
};

export const metadata: Metadata = {
  title: 'EvacuAid v2',
  description: 'Emergency SOS System',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased font-sans min-h-[100dvh] bg-background text-foreground" suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
