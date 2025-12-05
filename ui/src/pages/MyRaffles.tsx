import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Ticket, Lock, Unlock } from "lucide-react";
import Header from "@/components/Header";
import { toast } from "sonner";
import { getRaffleCount, getRaffleMeta, hasEntered, getUserEntryAmount } from "@/lib/contractUtils";
import { useZamaInstance } from "@/hooks/useZamaInstance";
import { getContractAddress } from "@/config/contracts";

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
  const { data: walletClient } = useWalletClient();
  const [createdRaffles, setCreatedRaffles] = useState<Raffle[]>([]);
  const [myEntries, setMyEntries] = useState<Raffle[]>([]);
  const [decryptedAmounts, setDecryptedAmounts] = useState<{[key: string]: number}>({});
  const [decryptingStates, setDecryptingStates] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);
  const isLocalNetwork = chainId === 31337;

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

          if (raffle.creator.toLowerCase() === address.toLowerCase()) {
            created.push(raffle);
          }

          if (await hasEntered(i, address, chainId)) {
            entries.push(raffle);
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

      if (!encryptedAmount) {
        console.warn('⚠️ No encrypted amount found for user in this raffle');
        toast.error("Could not find your entry in this raffle.");
        setDecryptedAmounts(prev => ({
          ...prev,
          [key]: -1
        }));
        return;
      }

      if (isLocalNetwork) {
        // Local network: encryptedAmount is actually a plain uint256, convert it
        console.log('[LOCAL] Decrypting plain amount on local network');
        const plainAmount = encryptedAmount;
        const amountInEth = Number(plainAmount) / 1e18;
        console.log('[LOCAL] Decrypted amount:', amountInEth, 'ETH');

        setDecryptedAmounts(prev => ({
          ...prev,
          [key]: amountInEth
        }));

        toast.success(`Decrypted your entry: ${amountInEth.toFixed(6)} ETH (Local mode - not encrypted)`);
      } else {
        // Sepolia: use FHE decryption
        console.log('[FHE] Starting FHE decryption...');
        const hex = typeof encryptedAmount === 'string' ? encryptedAmount : encryptedAmount.toString(16);
        console.log('[FHE] Converting to hex handle:', hex);

        let handleHex = hex;
        if (typeof encryptedAmount === 'bigint') {
          handleHex = encryptedAmount.toString(16).padStart(64, '0');
        }

        const handle = '0x' + handleHex;
        console.log('[FHE] Final handle:', handle);

        let decryptedValue: bigint | undefined;

        try {
          const keypair = zamaInstance.generateKeypair();
          console.log('[FHE] Generated keypair');

          const eip712 = zamaInstance.createEIP712(
            keypair.publicKey,
            [contractAddress],
            Math.floor(Date.now() / 1000),
            "10"
          );
          console.log('[FHE] Created EIP712:', eip712);

          console.log('[FHE] Requesting signature from wallet...');
          const signature = await walletClient!.signTypedData({
            domain: eip712.domain,
            types: eip712.types,
            primaryType: eip712.primaryType,
            message: eip712.message,
          });
          console.log('[FHE] Got signature:', signature.substring(0, 10) + '...');

          console.log('[FHE] Calling userDecrypt...');
          const result = await zamaInstance.userDecrypt(
            [{
              handle: handle,
              contractAddress: contractAddress
            }],
            keypair.privateKey,
            keypair.publicKey,
            signature.replace('0x', ''),
            [contractAddress],
            userAddress,
            Math.floor(Date.now() / 1000).toString(),
            "10"
          );
          console.log('[FHE] Decryption result:', result);

          decryptedValue = result[handle];
          console.log('[FHE] Decrypted value:', decryptedValue);
        } catch (decryptError: any) {
          console.error('❌ FHE decryption failed:', decryptError);
          toast.error("Failed to decrypt amount. Please try again.");
          setDecryptedAmounts(prev => ({
            ...prev,
            [key]: -1 // Error state
          }));
          return;
        }

        if (decryptedValue !== undefined) {
          console.log('🎉 Decryption successful!');
          const amountInEth = Number(decryptedValue) / 1e18;
          console.log('💰 Converted to ETH:', amountInEth);

          setDecryptedAmounts(prev => ({
            ...prev,
            [key]: amountInEth
          }));

          toast.success(`Successfully decrypted your entry: ${amountInEth.toFixed(6)} ETH`);
        } else {
          console.error('❌ Decryption returned undefined');
          toast.error("Decryption failed - returned undefined value");
          setDecryptedAmounts(prev => ({
            ...prev,
            [key]: -1
          }));
        }
      }
    } catch (error) {
      console.error(`❌ Error accessing entry amount for raffle ${raffleId}:`, error);
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      toast.error("Failed to access encrypted entry data.");
      setDecryptedAmounts(prev => ({
        ...prev,
        [key]: -1 // Error state
      }));
    } finally {
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
      return `${days}d ${hours}h`;
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
            {isLocalNetwork && (
              <span className="ml-4 px-3 py-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded text-sm font-medium">
                Local Network Mode
              </span>
            )}
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
            {isLocalNetwork && myEntries.length > 0 && (
              <Card className="mb-4 border-yellow-500/20 bg-yellow-500/5">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Local Network Mode</span>
                  </div>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    Entry amounts are stored as plain values (not encrypted) for development only.
                    Switch to Sepolia testnet for real FHE encryption.
                  </p>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : myEntries.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    You haven't entered any raffles yet
                  </p>
                  <Button onClick={() => navigate("/")}>
                    Browse Raffles
                  </Button>
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
                                <span>
                                  {isLocalNetwork ? 'Entry saved' : 'Entry encrypted with FHE 🔒'}
                                </span>
                              </div>
                              {isLocalNetwork ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full h-6 text-xs"
                                  onClick={() => decryptUserEntryAmount(raffle.id, address!)}
                                  disabled={decryptingStates[`${raffle.id}-${address}`]}
                                >
                                  {decryptingStates[`${raffle.id}-${address}`] ? (
                                    <>
                                      <Lock className="h-3 w-3 mr-1" />
                                      Loading...
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="h-3 w-3 mr-1" />
                                      View Amount
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full h-6 text-xs"
                                  onClick={() => decryptUserEntryAmount(raffle.id, address!)}
                                  disabled={decryptingStates[`${raffle.id}-${address}`] || zamaInstance === null}
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
                              )}
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
