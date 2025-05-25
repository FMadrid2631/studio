
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { RaffleProvider } from '@/contexts/RaffleContext';
import { LocalizationProvider } from '@/contexts/LocalizationContext';
import { AuthProvider } from '@/contexts/AuthContext'; // Import AuthProvider
import { Navbar } from '@/components/shared/Navbar';

export const metadata: Metadata = {
  title: 'Rifa Fácil',
  description: 'Manage and participate in raffles easily.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased flex flex-col min-h-screen`}>
        <LocalizationProvider> {/* LocalizationProvider should be outside AuthProvider */}
          <AuthProvider> {/* AuthProvider uses useTranslations, so it needs to be inside LocalizationProvider */}
            <RaffleProvider>
              <NavbarWrapper />
              <main className="flex-grow container mx-auto px-4 py-8">
                {children}
              </main>
              <Toaster />
            </RaffleProvider>
          </AuthProvider>
        </LocalizationProvider>
      </body>
    </html>
  );
}

function NavbarWrapper() {
  return <Navbar />;
}
