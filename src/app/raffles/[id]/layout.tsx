'use client';
import type React from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LayoutGrid, ListChecks, Edit3, Trophy, ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';

export default function RaffleDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();

  if (isLoading && !getRaffleById(raffleId)) {
     return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  const raffle = getRaffleById(raffleId);

  if (!raffle) {
    // This case should ideally be handled by individual pages, but as a fallback:
    return (
       <div className="text-center py-10">
        <Image src="https://placehold.co/300x200.png" alt="Raffle not found" width={300} height={200} className="mx-auto rounded-md shadow-md mb-4" data-ai-hint="error notfound"/>
        <h2 className="text-2xl font-semibold mb-4">Raffle Not Found</h2>
        <p className="text-muted-foreground mb-6">The raffle you are looking for does not exist or may have been removed.</p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>
      </div>
    );
  }
  
  const basePath = `/raffles/${raffleId}`;
  const navLinks = [
    { name: "Grid", href: basePath, icon: LayoutGrid },
    { name: "Purchase", href: `${basePath}/purchase`, icon: Edit3, disabled: raffle.status === 'Closed' },
    { name: "Available", href: `${basePath}/available`, icon: ListChecks },
    { name: "Draw", href: `${basePath}/draw`, icon: Trophy, disabled: raffle.status === 'Closed' },
  ];

  // Determine active tab. The main page (grid) is just `basePath`.
  // Other pages are `basePath/subpage`.
  let currentTabValue = basePath;
  if (pathname.startsWith(`${basePath}/purchase`)) currentTabValue = `${basePath}/purchase`;
  else if (pathname.startsWith(`${basePath}/available`)) currentTabValue = `${basePath}/available`;
  else if (pathname.startsWith(`${basePath}/draw`)) currentTabValue = `${basePath}/draw`;


  return (
    <div className="space-y-6">
      <Tabs value={currentTabValue} onValueChange={(value) => router.push(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto md:h-10 mb-6">
          {navLinks.map((link) => (
            <TabsTrigger key={link.href} value={link.href} disabled={link.disabled} className="flex-col md:flex-row h-auto py-2 md:py-1.5">
              <link.icon className="h-4 w-4 mb-1 md:mb-0 md:mr-2" />
              {link.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
