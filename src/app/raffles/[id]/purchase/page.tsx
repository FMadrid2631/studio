'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { PurchaseForm } from '@/components/raffle/PurchaseForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function PurchasePage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  const raffle = getRaffleById(raffleId);

  if (!raffle) {
     return (
      <div className="text-center py-10">
        <Image src="https://placehold.co/300x200.png" alt="Raffle not found" width={300} height={200} className="mx-auto rounded-md shadow-md mb-4" data-ai-hint="error notfound"/>
        <h2 className="text-2xl font-semibold mb-4">Raffle Not Found</h2>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  if (raffle.status === 'Closed') {
    return (
      <div className="text-center py-10">
        <Image src="https://placehold.co/300x200.png" alt="Raffle closed" width={300} height={200} className="mx-auto rounded-md shadow-md mb-4" data-ai-hint="closed sign"/>
        <h2 className="text-2xl font-semibold mb-4">Raffle Closed</h2>
        <p className="text-muted-foreground mb-6">This raffle is no longer open for purchases.</p>
        <Button variant="outline" onClick={() => router.push(`/raffles/${raffleId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Raffle
        </Button>
      </div>
    );
  }


  return (
    <div>
      <Button variant="outline" onClick={() => router.push(`/raffles/${raffleId}`)} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Raffle Details
      </Button>
      <PurchaseForm raffle={raffle} />
    </div>
  );
}
