import { useState, useEffect, useMemo } from "react";
import RaffleCard from "./RaffleCard";
import EntryModal from "./EntryModal";
import { toast } from "sonner";
import { CONTRACT_ADDRESS, getFHERaffleFactory } from "@/config/contracts";

interface RaffleMeta {
  creator: string;
  title: string;
  description: string;
  maxEntries: bigint;
  currentEntries: bigint;
  expireAt: bigint;
  isActive: boolean;
  isDrawn: boolean;
  winner: string;
  createdAt: bigint;
}

const RaffleBoard = () => {
  const [selectedRaffle, setSelectedRaffle] = useState<any>(null);
  const [raffles, setRaffles] = useState<any[]>([]);

  // Get raffle count - using direct contract call instead of wagmi hook
  // since we need dynamic ABI loading
  const [raffleCount, setRaffleCount] = useState<bigint | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { getRaffleCount } = await import('@/lib/contractUtils');
        const count = await getRaffleCount();
        setRaffleCount(BigInt(count));
      } catch (error) {
        console.error('Error fetching raffle count:', error);
      }
    };
    fetchCount();
  }, []);

  const count = useMemo(() => {
    if (!raffleCount) return 0;
    return Number(raffleCount);
  }, [raffleCount]);

  useEffect(() => {
    if (count > 0) {
      fetchRaffles();
    } else {
      setRaffles([]);
    }
  }, [count]);

  const fetchRaffles = async () => {
    try {
      const raffleList: any[] = [];
      
      for (let i = 0; i < count; i++) {
        try {
          // We'll need to fetch metadata using a custom hook or direct contract call
          // For now, we'll create a helper function
          const meta = await fetchRaffleMeta(i);
          if (!meta) continue;

          const now = Math.floor(Date.now() / 1000);
          const expireAt = Number(meta.expireAt);
          const isActive = meta.isActive && now < expireAt;

          if (isActive) {
            raffleList.push({
              id: i,
              name: meta.title,
              prize: "Encrypted", // Prize amount is encrypted
              totalEntries: Number(meta.currentEntries),
              timeRemaining: calculateTimeRemaining(expireAt),
              isActive: true,
              rawData: meta,
            });
          }
        } catch (error) {
          console.error(`Error fetching raffle ${i}:`, error);
        }
      }

      setRaffles(raffleList);
    } catch (error: any) {
      toast.error(error.message || "Failed to load raffles");
    }
  };

  const fetchRaffleMeta = async (raffleId: number): Promise<RaffleMeta | null> => {
    try {
      const { getRaffleMeta } = await import('@/lib/contractUtils');
      return await getRaffleMeta(raffleId);
    } catch (error) {
      console.error(`Error fetching raffle ${raffleId}:`, error);
      return null;
    }
  };

  const calculateTimeRemaining = (expireAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = expireAt - now;

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (60 * 60 * 24));
    const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((diff % (60 * 60)) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleEnterRaffle = (raffle: any) => {
    setSelectedRaffle(raffle);
  };

  const handleCloseModal = () => {
    setSelectedRaffle(null);
    fetchRaffles();
  };

  if (count === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">No raffles available yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-3xl font-bold text-foreground">Active Raffles</h2>
        <p className="text-muted-foreground">
          Join any raffle with encrypted entries. Your entry amount stays private until the draw.
        </p>
      </div>

      {raffles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Loading raffles...</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {raffles.map((raffle) => (
            <RaffleCard
              key={raffle.id}
              {...raffle}
              onEnter={() => handleEnterRaffle(raffle)}
            />
          ))}
        </div>
      )}

      {selectedRaffle && (
        <EntryModal
          isOpen={!!selectedRaffle}
          onClose={handleCloseModal}
          raffle={selectedRaffle}
        />
      )}
    </div>
  );
};

export default RaffleBoard;
