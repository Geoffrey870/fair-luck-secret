import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import Header from "@/components/Header";

export default function CreateRaffle() {
  const navigate = useNavigate();
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
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to create a raffle");
        navigate("/auth");
        return;
      }

      const expireAt = new Date();
      expireAt.setHours(expireAt.getHours() + parseInt(formData.duration));

      const { error } = await supabase.from("raffles").insert({
        creator_id: user.id,
        title: formData.title,
        description: formData.description,
        prize_amount: parseFloat(formData.prizeAmount),
        entry_fee: parseFloat(formData.entryFee),
        max_entries: parseInt(formData.maxEntries),
        expire_at: expireAt.toISOString(),
        status: "active",
      });

      if (error) throw error;

      toast.success("Raffle created successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to create raffle");
    } finally {
      setLoading(false);
    }
  };

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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Raffle..." : "Create Raffle"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
