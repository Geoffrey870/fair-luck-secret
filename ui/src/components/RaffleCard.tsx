import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Trophy, Clock, Users } from "lucide-react";

interface RaffleCardProps {
  id: string;
  name: string;
  prize: string;
  totalEntries: number;
  timeRemaining: string;
  isActive: boolean;
  onEnter: () => void;
}

const RaffleCard = ({
  name,
  prize,
  totalEntries,
  timeRemaining,
  isActive,
  onEnter,
}: RaffleCardProps) => {
  return (
    <Card className="relative overflow-hidden border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-glow)] animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold text-foreground">{name}</h3>
          {isActive && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <Lock className="h-4 w-4 text-primary animate-pulse-glow" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-2xl font-bold text-accent">
          <Trophy className="h-6 w-6" />
          <span>{prize}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{totalEntries} Encrypted Entries</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{timeRemaining}</span>
          </div>
        </div>

        <div className="pt-2">
          <Button 
            onClick={onEnter}
            disabled={!isActive}
            className="w-full"
          >
            {isActive ? "Enter Raffle" : "Ended"}
          </Button>
        </div>

        {isActive && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Your entry amount is encrypted and private</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RaffleCard;
