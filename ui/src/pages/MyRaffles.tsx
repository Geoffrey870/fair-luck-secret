import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Ticket } from "lucide-react";
import Header from "@/components/Header";
import { toast } from "sonner";

interface Raffle {
  id: string;
  title: string;
  description: string;
  prize_amount: number;
  entry_fee: number;
  max_entries: number;
  expire_at: string;
  status: string;
  created_at: string;
}

interface Entry {
  id: string;
  raffle_id: string;
  created_at: string;
  raffles: Raffle;
}

export default function MyRaffles() {
  const navigate = useNavigate();
  const [createdRaffles, setCreatedRaffles] = useState<Raffle[]>([]);
  const [myEntries, setMyEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRaffles();
  }, []);

  const fetchMyRaffles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch created raffles
      const { data: created, error: createdError } = await supabase
        .from("raffles")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (createdError) throw createdError;
      setCreatedRaffles(created || []);

      // Fetch entries
      const { data: entries, error: entriesError } = await supabase
        .from("raffle_entries")
        .select(`
          *,
          raffles (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (entriesError) throw entriesError;
      setMyEntries(entries || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load raffles");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expireAt: string) => {
    const now = new Date();
    const expire = new Date(expireAt);
    const diff = expire.getTime() - now.getTime();

    if (diff <= 0) return "Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

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
                          variant={raffle.status === "active" ? "default" : "secondary"}
                        >
                          {raffle.status}
                        </Badge>
                      </div>
                      <CardDescription>{raffle.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prize:</span>
                        <span className="font-semibold text-primary">
                          {raffle.prize_amount} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Entry Fee:</span>
                        <span className="font-semibold">{raffle.entry_fee} ETH</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max Entries:</span>
                        <span className="font-semibold">{raffle.max_entries}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time Left:</span>
                        <span className="font-semibold">
                          {getTimeRemaining(raffle.expire_at)}
                        </span>
                      </div>
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
                {myEntries.map((entry) => (
                  <Card key={entry.id} className="border-primary/20 hover:shadow-glow transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{entry.raffles.title}</CardTitle>
                      <CardDescription>{entry.raffles.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prize:</span>
                        <span className="font-semibold text-primary">
                          {entry.raffles.prize_amount} ETH
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={entry.raffles.status === "active" ? "default" : "secondary"}>
                          {entry.raffles.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time Left:</span>
                        <span className="font-semibold">
                          {getTimeRemaining(entry.raffles.expire_at)}
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
