import { useState, useEffect, useMemo } from "react";
import RaffleCard from "./RaffleCard";
import EntryModal from "./EntryModal";
import { toast } from "sonner";
import { useChainId } from "wagmi";

interface RaffleMeta {
  creator: string;
  title: string;
  description: string;
  prizeAmount: bigint;
  entryFee: bigint;
  maxEntries: number;
  currentEntries: number;
  expireAt: number;
  isActive: boolean;
  isDrawn: boolean;
  winner: string;
  createdAt: number;
}

const RaffleBoard = () => {
  const chainId = useChainId();
  const [selectedRaffle, setSelectedRaffle] = useState<any>(null);
  const [raffles, setRaffles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get raffle count
  const [raffleCount, setRaffleCount] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!chainId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { getRaffleCount, getRaffleMeta } = await import('@/lib/contractUtils');
        
        // Get raffle count
        const count = await getRaffleCount(chainId);
        console.log('Raffle count:', count);
        setRaffleCount(count);

        if (count === 0) {
          setRaffles([]);
          setLoading(false);
          return;
        }

        // Fetch all raffles
        const raffleList: any[] = [];
        
        for (let i = 0; i < count; i++) {
          try {
            const meta = await getRaffleMeta(i, chainId);
            console.log(`Raffle ${i} meta:`, meta);
            
            if (!meta) continue;

            const now = Math.floor(Date.now() / 1000);
            const expireAt = Number(meta.expireAt);
            const isActive = meta.isActive && now < expireAt;

            // Show all raffles, not just active ones
            const prizeEth = Number(meta.prizeAmount) / 1e18;
            const entryFeeEth = Number(meta.entryFee) / 1e18;
            
            raffleList.push({
              id: i,
              name: meta.title,
              prize: `${prizeEth.toFixed(4)} ETH`,
              entryFee: meta.entryFee,
              totalEntries: Number(meta.currentEntries),
              timeRemaining: calculateTimeRemaining(expireAt),
              isActive: isActive,
              rawData: meta,
            });
          } catch (err) {
            console.error(`Error fetching raffle ${i}:`, err);
          }
        }

        console.log('Fetched raffles:', raffleList);
        setRaffles(raffleList);
      } catch (err: any) {
        console.error('Error fetching raffles:', err);
        setError(err.message || 'Failed to load raffles');
        toast.error(err.message || "Failed to load raffles");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chainId]);

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
    // Refresh raffles after modal closes
    if (chainId) {
      const fetchData = async () => {
        try {
          const { getRaffleCount, getRaffleMeta } = await import('@/lib/contractUtils');
          const count = await getRaffleCount(chainId);
          setRaffleCount(count);
          
          const raffleList: any[] = [];
          for (let i = 0; i < count; i++) {
            try {
              const meta = await getRaffleMeta(i, chainId);
              if (!meta) continue;
              
              const now = Math.floor(Date.now() / 1000);
              const expireAt = Number(meta.expireAt);
              const isActive = meta.isActive && now < expireAt;
              const prizeEth = Number(meta.prizeAmount) / 1e18;
              
              raffleList.push({
                id: i,
                name: meta.title,
                prize: `${prizeEth.toFixed(4)} ETH`,
                entryFee: meta.entryFee,
                totalEntries: Number(meta.currentEntries),
                timeRemaining: calculateTimeRemaining(expireAt),
                isActive: isActive,
                rawData: meta,
              });
            } catch (err) {
              console.error(`Error fetching raffle ${i}:`, err);
            }
          }
          setRaffles(raffleList);
        } catch (err) {
          console.error('Error refreshing raffles:', err);
        }
      };
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Loading raffles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500 mb-2">Error: {error}</p>
        <p className="text-muted-foreground text-sm">
          Make sure you're connected to the correct network and the contract is deployed.
        </p>
      </div>
    );
  }

  if (raffleCount === 0) {
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
          <p className="text-muted-foreground mb-4">No active raffles found.</p>
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
