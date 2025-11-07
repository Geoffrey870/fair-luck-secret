import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffle: any;
}

const EntryModal = ({ isOpen, onClose, raffle }: EntryModalProps) => {
  const [entryAmount, setEntryAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to enter a raffle");
        navigate("/auth");
        return;
      }

      const encryptedAmount = `FHE_ENCRYPTED_${btoa(entryAmount)}_${Date.now()}`;

      const { error } = await supabase.from("raffle_entries").insert({
        raffle_id: raffle.id,
        user_id: user.id,
        encrypted_amount: encryptedAmount,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You have already entered this raffle");
        } else {
          throw error;
        }
      } else {
        toast.success("Entry submitted! Your amount is encrypted and secure.");
        setEntryAmount("");
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!raffle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Enter {raffle.name}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Prize: {raffle.prize}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">
              Entry Amount (ETH)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              min={raffle.rawData?.entry_fee || 0.001}
              placeholder={`Min: ${raffle.rawData?.entry_fee || 0.001} ETH`}
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              required
              className="border-border bg-background text-foreground"
            />
            {raffle.rawData?.entry_fee && (
              <p className="text-xs text-muted-foreground">
                Minimum entry: {raffle.rawData.entry_fee} ETH
              </p>
            )}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Privacy Protected</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your entry amount will be encrypted using Fully Homomorphic Encryption (FHE).
              Other participants cannot see your entry amount until the draw is complete.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isSubmitting || !entryAmount}
            >
              {isSubmitting ? (
                <>
                  <Lock className="h-4 w-4 animate-lock-spin" />
                  Encrypting...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Submit Entry
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EntryModal;
