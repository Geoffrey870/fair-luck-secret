import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useChainId } from "wagmi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Ticket, Lock, Unlock } from "lucide-react";
import Header from "@/components/Header";
import { toast } from "sonner";
import { getRaffleCount, getRaffleMeta, hasEntered, getUserEntryAmount } from "@/lib/contractUtils";
import { useZamaInstance } from "@/hooks/useZamaInstance";
import { useEthersSigner } from "@/hooks/useEthersSigner";

interface Raffle {
  id: number;
  title: string;
  description: string;
  creator: string;
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

export default function MyRaffles() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { instance: zamaInstance } = useZamaInstance();
  const signerPromise = useEthersSigner();
  const [createdRaffles, setCreatedRaffles] = useState<Raffle[]>([]);
  const [myEntries, setMyEntries] = useState<Raffle[]>([]);
  const [decryptedAmounts, setDecryptedAmounts] = useState<{[key: string]: number}>({});
  const [decryptingStates, setDecryptingStates] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address && chainId) {
      fetchMyRaffles();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, chainId]);

  const fetchMyRaffles = async () => {
    if (!address || !chainId) return;

    try {
      setLoading(true);
      const count = await getRaffleCount(chainId);
      const created: Raffle[] = [];
      const entries: Raffle[] = [];

      for (let i = 0; i < count; i++) {
        try {
          const meta = await getRaffleMeta(i, chainId);
          if (!meta) continue;

          const raffle: Raffle = {
            id: i,
            title: meta.title,
            description: meta.description,
            creator: meta.creator,
            prizeAmount: meta.prizeAmount,
            entryFee: meta.entryFee,
            maxEntries: Number(meta.maxEntries),
            currentEntries: Number(meta.currentEntries),
            expireAt: Number(meta.expireAt),
            isActive: meta.isActive,
            isDrawn: meta.isDrawn,
            winner: meta.winner,
            createdAt: Number(meta.createdAt),
          };

          // Check if user created this raffle
          if (raffle.creator.toLowerCase() === address.toLowerCase()) {
            created.push(raffle);
          }

          // Check if user has entered this raffle
          try {
            const entered = await hasEntered(i, address, chainId);
            if (entered) {
              entries.push(raffle);
              // Don't auto-decrypt, let user manually decrypt for privacy
            }
          } catch (error) {
            console.error(`Error checking entry for raffle ${i}:`, error);
          }
        } catch (error) {
          console.error(`Error fetching raffle ${i}:`, error);
        }
      }

      setCreatedRaffles(created.sort((a, b) => b.createdAt - a.createdAt));
      setMyEntries(entries.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error: any) {
      toast.error(error.message || "Failed to load raffles");
    } finally {
      setLoading(false);
    }
  };

  const decryptUserEntryAmount = async (raffleId: number, userAddress: string) => {
    const key = `${raffleId}-${userAddress}`;
    console.log('🔓 Starting decryption process for raffle', raffleId, 'user', userAddress);

    const contractAddress = getContractAddress(chainId);
    console.log('🏠 Contract address for decryption:', contractAddress);

    if (!contractAddress) {
      console.error('❌ No contract address found for chain', chainId);
      toast.error("Contract not deployed on current network. Cannot decrypt amount.");
      setDecryptedAmounts(prev => ({
        ...prev,
        [key]: -1
      }));
      setDecryptingStates(prev => ({
        ...prev,
        [key]: false
      }));
      return;
    }

    // Set decrypting state
    setDecryptingStates(prev => ({
      ...prev,
      [key]: true
    }));

    try {
      console.log('🔍 Checking FHE instance availability...');
      if (!zamaInstance) {
        console.error('❌ FHE instance not available');
        toast.error("FHE service not available. Cannot decrypt amount.");
        setDecryptedAmounts(prev => ({
          ...prev,
          [key]: -1 // Special value indicating amount is private
        }));
        return;
      }
      console.log('✅ FHE instance is available');

      console.log('📡 Fetching encrypted entry amount from contract...');
      const encryptedAmount = await getUserEntryAmount(raffleId, userAddress, chainId);
      console.log('📦 Encrypted amount result:', encryptedAmount);

      if (encryptedAmount) {
        console.log('🔐 Attempting FHE decryption...');
        console.log('🔍 Available methods on zamaInstance:', Object.getOwnPropertyNames(zamaInstance));
        console.log('🔍 Zama instance type:', typeof zamaInstance);

        try {
          // Generate keypair for decryption
          console.log('🔑 Generating keypair for decryption...');
          const keypair = zamaInstance.generateKeypair();
          console.log('✅ Keypair generated');

          // Prepare decryption request
          const handleContractPairs = [
            {
              handle: encryptedAmount.toString(),
              contractAddress: contractAddress,
            },
          ];

          const startTimeStamp = Math.floor(Date.now() / 1000).toString();
          const durationDays = "10";
          const contractAddresses = [contractAddress];

          // Create EIP712 typed data
          console.log('📝 Creating EIP712 typed data...');
          const eip712 = zamaInstance.createEIP712(
            keypair.publicKey,
            contractAddresses,
            startTimeStamp,
            durationDays
          );
          console.log('✅ EIP712 data created');

          // Get signer and sign typed data
          const signer = await signerPromise;
          if (!signer) {
            throw new Error('No signer available for signature');
          }

          console.log('✍️ Requesting user signature...');
          const signature = await signer.signTypedData({
            domain: eip712.domain,
            types: {
              UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
            },
            primaryType: 'UserDecryptRequestVerification',
            message: eip712.message
          });
          console.log('✅ User signature obtained');

          // Execute decryption
          console.log('🔓 Executing user decryption...');
          const result = await zamaInstance.userDecrypt(
            handleContractPairs,
            keypair.privateKey,
            keypair.publicKey,
            signature.replace("0x", ""),
            contractAddresses,
            address!,
            startTimeStamp,
            durationDays
          );

          console.log('🎉 Decryption result:', result);
          const decrypted = result[encryptedAmount.toString()];
          console.log('💰 Final decrypted value:', decrypted);

          console.log('🎉 Decryption successful, raw result:', decrypted);

          const amountInEth = Number(decrypted) / 1e18;
          console.log('💰 Converted to ETH:', amountInEth);

          setDecryptedAmounts(prev => ({
            ...prev,
            [key]: amountInEth
          }));

          toast.success(`Successfully decrypted your entry amount: ${amountInEth.toFixed(4)} ETH`);
          console.log('✅ Decryption process completed successfully');
        } catch (decryptError) {
          console.error('❌ Decryption failed with error:', decryptError);
          console.error('❌ Error details:', {
            message: decryptError.message,
            stack: decryptError.stack,
            name: decryptError.name
          });
          toast.error("Failed to decrypt amount. You may not have permission or FHE setup is incomplete.");
          setDecryptedAmounts(prev => ({
            ...prev,
            [key]: -1 // Indicates decryption failed
          }));
        }
      } else {
        console.warn('⚠️ No encrypted amount found for user in this raffle');
        toast.error("Could not find your entry in this raffle.");
        setDecryptedAmounts(prev => ({
          ...prev,
          [key]: -1
        }));
      }
    } catch (error) {
      console.error(`❌ Error accessing entry amount for raffle ${raffleId}:`, error);
      console.error('❌ Access error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error("Failed to access encrypted entry data.");
      setDecryptedAmounts(prev => ({
        ...prev,
        [key]: -1 // Error state
      }));
    } finally {
      // Clear decrypting state
      setDecryptingStates(prev => ({
        ...prev,
        [key]: false
      }));
      console.log('🏁 Decryption process finished');
    }
  };

  const getTimeRemaining = (expireAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = expireAt - now;

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (60 * 60 * 24));
    const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((diff % (60 * 60)) / 60);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Please connect your wallet to view your raffles</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to All Raffles
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Raffles</h1>
          <p className="text-muted-foreground">
            View and manage your created raffles and entries
          </p>
        </div>

        <Tabs defaultValue="created" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="created" className="gap-2">
              <Trophy className="w-4 h-4" />
              Created Raffles
            </TabsTrigger>
            <TabsTrigger value="entries" className="gap-2">
              <Ticket className="w-4 h-4" />
              My Entries
            </TabsTrigger>
          </TabsList>

          <TabsContent value="created" className="mt-6">
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : createdRaffles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    You haven't created any raffles yet
                  </p>
                  <Button onClick={() => navigate("/create-raffle")}>
                    Create Your First Raffle
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {createdRaffles.map((raffle) => (
                  <Card key={raffle.id} className="border-primary/20 hover:shadow-glow transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{raffle.title}</CardTitle>
                        <Badge
                          variant={raffle.isActive ? "default" : "secondary"}
                        >
                          {raffle.isActive ? "Active" : raffle.isDrawn ? "Drawn" : "Ended"}
                        </Badge>
                      </div>
                      <CardDescription>{raffle.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prize:</span>
                        <span className="font-semibold text-primary">
                          {Number(raffle.prizeAmount) / 1e18} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Entry Fee:</span>
                        <span className="font-semibold">
                          {Number(raffle.entryFee) / 1e18} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max Entries:</span>
                        <span className="font-semibold">{raffle.maxEntries}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current Entries:</span>
                        <span className="font-semibold">{raffle.currentEntries}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time Left:</span>
                        <span className="font-semibold">
                          {getTimeRemaining(raffle.expireAt)}
                        </span>
                      </div>
                      {raffle.isDrawn && raffle.winner && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Winner:</span>
                          <span className="font-semibold text-primary">
                            {raffle.winner.slice(0, 6)}...{raffle.winner.slice(-4)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="entries" className="mt-6">
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : myEntries.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    You haven't entered any raffles yet
                  </p>
                  <Button onClick={() => navigate("/")}>Browse Raffles</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myEntries.map((raffle) => (
                  <Card key={raffle.id} className="border-primary/20 hover:shadow-glow transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{raffle.title}</CardTitle>
                      <CardDescription>{raffle.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prize:</span>
                        <span className="font-semibold text-primary">
                          {Number(raffle.prizeAmount) / 1e18} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Entry Fee:</span>
                        <span className="font-semibold">
                          {Number(raffle.entryFee) / 1e18} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={raffle.isActive ? "default" : "secondary"}>
                          {raffle.isActive ? "Active" : raffle.isDrawn ? "Drawn" : "Ended"}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time Left:</span>
                        <span className="font-semibold">
                          {getTimeRemaining(raffle.expireAt)}
                        </span>
                      </div>
                      <div className="p-2 bg-primary/5 rounded text-xs space-y-2">
                        <div className="text-center">
                          {decryptedAmounts[`${raffle.id}-${address}`] === undefined ? (
                            <>
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Lock className="h-3 w-3" />
                                <span>Entry encrypted with FHE 🔒</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-6 text-xs"
                                onClick={() => decryptUserEntryAmount(raffle.id, address!)}
                                disabled={decryptingStates[`${raffle.id}-${address}`]}
                              >
                                {decryptingStates[`${raffle.id}-${address}`] ? (
                                  <>
                                    <Lock className="h-3 w-3 mr-1 animate-spin" />
                                    Decrypting...
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="h-3 w-3 mr-1" />
                                    Decrypt Amount
                                  </>
                                )}
                              </Button>
                            </>
                          ) : decryptedAmounts[`${raffle.id}-${address}`] === -1 ? (
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Lock className="h-3 w-3" />
                                <span>Amount kept private 🔒</span>
                              </div>
                              <div className="text-muted-foreground text-xs">
                                Cannot decrypt at this time
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Unlock className="h-3 w-3" />
                                <span>Entry decrypted ✅</span>
                              </div>
                              <div className="font-semibold text-primary">
                                Your entry: {decryptedAmounts[`${raffle.id}-${address}`]?.toFixed(4)} ETH
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
