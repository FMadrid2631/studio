
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { RaffleProvider } from '@/contexts/RaffleContext';
import { LocalizationProvider, useTranslations } from '@/contexts/LocalizationContext';
import { Navbar } from '@/components/shared/Navbar';

// This component now needs to be a client component to use useTranslations for metadata
// Or metadata needs to be static / handled differently for dynamic titles.
// For simplicity, we make it a client component.
// If server-side metadata translation is needed, it's more complex.

const AppMetadata = () => {
  const { t } = useTranslations();
  return null; // Metadata is set in RootLayout directly after provider init
};

export const metadata: Metadata = {
  // Title and description will be set dynamically if needed via a client component,
  // or remain static if that's acceptable. For now, let's keep them simple.
  // A more advanced setup would involve a client component updating document.title.
  title: 'Rifa Fácil', // Default title, can be overridden
  description: 'Manage and participate in raffles easily.', // Default description
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased flex flex-col min-h-screen`}>
        <RaffleProvider>
          <LocalizationProvider>
            {/* Client component to potentially set dynamic metadata title based on locale */}
            {/* <AppMetadata />  // No longer needed if we make Layout a client component or handle title differently */}
            <NavbarWrapper />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <Toaster />
          </LocalizationProvider>
        </RaffleProvider>
      </body>
    </html>
  );
}

// Navbar needs to be wrapped to use useTranslations
function NavbarWrapper() {
  // const { t } = useTranslations(); // If Navbar itself doesn't use t for title, this is fine
  // We can update metadata directly here if RootLayout becomes 'use client'
  // For now, Navbar component itself will use 'use client'
  return <Navbar />;
}
