'use client';

import Link from 'next/link';
import { useRaffles } from '@/contexts/RaffleContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Eye, Edit, ListChecks, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function HomePage() {
  const { raffles, isLoading } = useRaffles();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="text-center py-12 bg-gradient-to-r from-primary/10 via-background to-accent/10 rounded-lg shadow-md">
        <h1 className="text-5xl font-bold text-primary mb-4">Welcome to Rifa Fácil!</h1>
        <p className="text-xl text-muted-foreground mb-8">Your one-stop solution for creating and managing raffles effortlessly.</p>
        <Button asChild size="lg">
          <Link href="/configure">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Raffle
          </Link>
        </Button>
      </section>

      {raffles.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle className="text-2xl">No Raffles Yet</CardTitle>
            <CardDescription>Get started by creating your first raffle!</CardDescription>
          </CardHeader>
          <CardContent>
            <Image src="https://placehold.co/300x200.png" alt="No raffles placeholder" width={300} height={200} className="mx-auto rounded-md shadow-md" data-ai-hint="empty state illustration" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {raffles.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((raffle) => (
            <Card key={raffle.id} className="flex flex-col hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-2xl text-primary">{raffle.name}</CardTitle>
                  <Badge variant={raffle.status === 'Open' ? 'default' : 'secondary'} className={raffle.status === 'Open' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                    {raffle.status}
                  </Badge>
                </div>
                <CardDescription>
                  {raffle.totalNumbers} numbers | {raffle.numberValue} {raffle.country.currencySymbol} each
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <p className="text-sm text-muted-foreground">Country: {raffle.country.name}</p>
                <p className="text-sm text-muted-foreground">Prizes: {raffle.prizes.length}</p>
                <p className="text-sm text-muted-foreground">Draw Date: {new Date(raffle.drawDate).toLocaleDateString()}</p>
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-2">
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/raffles/${raffle.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> View Grid
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/raffles/${raffle.id}/purchase`}>
                    <Edit className="mr-2 h-4 w-4" /> Purchase
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/raffles/${raffle.id}/available`}>
                    <ListChecks className="mr-2 h-4 w-4" /> Available
                  </Link>
                </Button>
                <Button variant="default" asChild className="w-full" disabled={raffle.status === 'Closed'}>
                  <Link href={`/raffles/${raffle.id}/draw`}>
                    <Trophy className="mr-2 h-4 w-4" /> Draw
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
