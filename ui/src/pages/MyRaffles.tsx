import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useChainId } from "wagmi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Ticket } from "lucide-react";
import Header from "@/components/Header";
import { toast } from "sonner";
import { getRaffleCount, getRaffleMeta, hasEntered } from "@/lib/contractUtils";

interface Raffle {
  id: number;
  title: string;
  description: string;
  creator: string;
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
  const [createdRaffles, setCreatedRaffles] = useState<Raffle[]>([]);
  const [myEntries, setMyEntries] = useState<Raffle[]>([]);
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
                          Encrypted
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
                          Encrypted
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
                      <div className="p-2 bg-primary/5 rounded text-xs text-center">
                        Entry encrypted with FHE 🔒
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
