import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import RaffleCard from "./RaffleCard";
import EntryModal from "./EntryModal";
import { toast } from "sonner";

const RaffleBoard = () => {
  const [selectedRaffle, setSelectedRaffle] = useState<any>(null);
  const [raffles, setRaffles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRaffles();
    
    const channel = supabase
      .channel('raffles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raffles'
        },
        () => {
          fetchRaffles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from("raffles")
        .select(`
          *,
          raffle_entries(count)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rafflesWithCounts = data.map((raffle) => ({
        id: raffle.id,
        name: raffle.title,
        prize: `${raffle.prize_amount} ETH`,
        totalEntries: raffle.raffle_entries[0]?.count || 0,
        timeRemaining: calculateTimeRemaining(raffle.expire_at),
        isActive: raffle.status === "active",
        rawData: raffle,
      }));

      setRaffles(rafflesWithCounts);
    } catch (error: any) {
      toast.error(error.message || "Failed to load raffles");
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = (expireAt: string) => {
    const now = new Date();
    const expire = new Date(expireAt);
    const diff = expire.getTime() - now.getTime();

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Loading raffles...</p>
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
          <p className="text-muted-foreground mb-4">No active raffles at the moment</p>
          <p className="text-sm text-muted-foreground">Check back soon or create your own!</p>
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
