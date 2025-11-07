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
import { useAccount } from "wagmi";
import { Contract } from "ethers";
import { useZamaInstance } from "@/hooks/useZamaInstance";
import { useEthersSigner } from "@/hooks/useEthersSigner";
import { CONTRACT_ADDRESS, getFHERaffleFactory } from "@/config/contracts";

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffle: any;
}

const EntryModal = ({ isOpen, onClose, raffle }: EntryModalProps) => {
  const { address, isConnected } = useAccount();
  const { instance, isLoading: zamaLoading } = useZamaInstance();
  const signerPromise = useEthersSigner();
  const [entryAmount, setEntryAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!instance || !signerPromise) {
      toast.error("Encryption service not ready");
      return;
    }

    setIsSubmitting(true);

    try {
      const entryAmountWei = parseFloat(entryAmount) * 1e18;
      const entryAmountScaled = Math.floor(entryAmountWei / 1e12);

      // Encrypt entry amount
      const encryptedAmount = await instance
        .createEncryptedInput(CONTRACT_ADDRESS, address)
        .add32(entryAmountScaled)
        .encrypt();

      // Submit to contract
      const signer = await signerPromise;
      const Factory = await getFHERaffleFactory();
      const contract = new Contract(
        CONTRACT_ADDRESS,
        Factory.abi,
        signer
      );

      setIsConfirming(true);
      const tx = await contract.enterRaffle(
        raffle.id,
        encryptedAmount.handles[0],
        encryptedAmount.inputProof
      );

      await tx.wait();

      toast.success("Entry submitted! Your amount is encrypted and secure.");
      setEntryAmount("");
      onClose();
    } catch (error: any) {
      console.error("Error entering raffle:", error);
      if (error.message?.includes("Already entered")) {
        toast.error("You have already entered this raffle");
      } else {
        toast.error(error.message || "Failed to submit entry");
      }
    } finally {
      setIsSubmitting(false);
      setIsConfirming(false);
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
              min="0.001"
              placeholder="0.1"
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              required
              className="border-border bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Minimum entry: 0.001 ETH
            </p>
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
              disabled={isSubmitting || isConfirming}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isSubmitting || isConfirming || !entryAmount || zamaLoading || !isConnected}
            >
              {zamaLoading ? (
                <>
                  <Lock className="h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : isSubmitting ? (
                <>
                  <Lock className="h-4 w-4 animate-spin" />
                  Encrypting...
                </>
              ) : isConfirming ? (
                <>
                  <Lock className="h-4 w-4 animate-spin" />
                  Confirming...
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
