import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useChainId } from "wagmi";
import { Contract } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import { useZamaInstance } from "@/hooks/useZamaInstance";
import { useEthersSigner } from "@/hooks/useEthersSigner";
import { CONTRACT_ADDRESS, getFHERaffleFactory } from "@/config/contracts";

export default function CreateRaffle() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { instance, isLoading: zamaLoading } = useZamaInstance();
  const signerPromise = useEthersSigner();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    prizeAmount: "",
    entryFee: "",
    maxEntries: "",
    duration: "24",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!signerPromise) {
      toast.error("Wallet not ready");
      return;
    }

    // Check network - allow both local (31337) and Sepolia (11155111)
    const isLocalNetwork = chainId === 31337;
    const isSepoliaNetwork = chainId === 11155111;
    
    if (!isLocalNetwork && !isSepoliaNetwork) {
      toast.error(`Please switch to Hardhat local network (chainId: 31337) or Sepolia testnet (chainId: 11155111). Current chainId: ${chainId}`);
      return;
    }

    setLoading(true);

    try {
      // Validate form data
      const prizeAmount = parseFloat(formData.prizeAmount);
      const entryFee = parseFloat(formData.entryFee);
      const maxEntries = parseInt(formData.maxEntries);
      const duration = parseInt(formData.duration);

      if (isNaN(prizeAmount) || prizeAmount <= 0) {
        toast.error("Prize amount must be greater than 0");
        setLoading(false);
        return;
      }

      if (isNaN(entryFee) || entryFee <= 0) {
        toast.error("Entry fee must be greater than 0");
        setLoading(false);
        return;
      }

      if (isNaN(maxEntries) || maxEntries < 2) {
        toast.error("Max entries must be at least 2");
        setLoading(false);
        return;
      }

      if (isNaN(duration) || duration <= 0) {
        toast.error("Duration must be greater than 0");
        setLoading(false);
        return;
      }

      const prizeAmountWei = BigInt(Math.floor(prizeAmount * 1e18));
      const entryFeeWei = BigInt(Math.floor(entryFee * 1e18));

      // Submit to contract (prize and entry fee are now public, not encrypted)
      const signer = await signerPromise;
      const Factory = await getFHERaffleFactory();
      const contract = new Contract(
        CONTRACT_ADDRESS,
        Factory.abi,
        signer
      );

      // Verify contract exists at address
      const provider = signer.provider;
      if (provider) {
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (code === '0x' || code === '0x0') {
          toast.error(`Contract not found at address ${CONTRACT_ADDRESS}. Please deploy the contract first.`);
          setLoading(false);
          return;
        }
      }

      console.log('Creating raffle with params:', {
        title: formData.title,
        description: formData.description,
        prizeAmount: prizeAmountWei.toString(),
        entryFee: entryFeeWei.toString(),
        maxEntries,
        duration,
        chainId,
        contractAddress: CONTRACT_ADDRESS
      });

      // Estimate gas first to catch errors early (optional, skip if it fails)
      let gasEstimate;
      try {
        gasEstimate = await contract.createRaffle.estimateGas(
          formData.title,
          formData.description,
          prizeAmountWei,
          entryFeeWei,
          maxEntries,
          duration
        );
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (estimateError: any) {
        console.warn('Gas estimation failed, proceeding without gas limit:', estimateError.message);
        // Continue without gas estimate - the transaction will use default gas
      }

      // Send transaction with optional gas limit
      const txOptions: any = {};
      if (gasEstimate) {
        // Add 20% buffer to gas estimate
        txOptions.gasLimit = gasEstimate + (gasEstimate / BigInt(5));
      }

      const tx = await contract.createRaffle(
        formData.title,
        formData.description,
        prizeAmountWei,
        entryFeeWei,
        maxEntries,
        duration,
        Object.keys(txOptions).length > 0 ? txOptions : undefined
      );

      console.log('Transaction sent:', tx.hash);
      toast.info(`Transaction sent: ${tx.hash.substring(0, 10)}...`);

      await tx.wait();

      toast.success("Raffle created successfully!");
      navigate("/");
    } catch (error: any) {
      console.error("Error creating raffle:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to create raffle";
      
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        if (error.message.includes("require")) {
          errorMessage = "Invalid raffle parameters. Please check your inputs.";
        } else if (error.message.includes("network") || error.message.includes("chain")) {
          errorMessage = `Network error. Please ensure you're connected to the correct network (chainId: ${chainId}).`;
        } else if (error.message.includes("revert")) {
          errorMessage = "Transaction reverted. Please check your inputs and ensure the contract is deployed.";
        } else {
          errorMessage = error.message;
        }
      } else if (error.data) {
        errorMessage = `Contract error: ${JSON.stringify(error.data)}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Please connect your wallet to create a raffle</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Raffles
        </Button>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <CardTitle className="text-2xl">Create New Raffle</CardTitle>
            </div>
            <CardDescription>
              Set up your raffle with encrypted entries powered by FHE
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Raffle Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Grand Prize Draw"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your raffle..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prizeAmount">Prize Amount (ETH)</Label>
                  <Input
                    id="prizeAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="5.0"
                    value={formData.prizeAmount}
                    onChange={(e) => setFormData({ ...formData, prizeAmount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entryFee">Entry Fee (ETH)</Label>
                  <Input
                    id="entryFee"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.1"
                    value={formData.entryFee}
                    onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxEntries">Max Entries</Label>
                  <Input
                    id="maxEntries"
                    type="number"
                    min="2"
                    placeholder="100"
                    value={formData.maxEntries}
                    onChange={(e) => setFormData({ ...formData, maxEntries: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    placeholder="24"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  <strong>Privacy Protected:</strong> All entry amounts will be encrypted using
                  Fully Homomorphic Encryption (FHE), ensuring complete privacy until the draw is
                  completed.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Creating Raffle..." : "Create Raffle"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
