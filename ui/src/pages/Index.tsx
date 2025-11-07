import Header from "@/components/Header";
import RaffleBoard from "@/components/RaffleBoard";
import { Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Powered by Fully Homomorphic Encryption</span>
            </div>
            
            <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-5xl font-bold text-transparent sm:text-6xl">
              Fair Luck, Protected by FHE.
            </h1>
            
            <p className="text-lg text-muted-foreground">
              Join on-chain raffles where your entry amounts stay private until the draw.
              No more strategic gaming or whale watching—just fair, transparent results.
            </p>
          </div>
        </section>

        {/* Raffle Board */}
        <RaffleBoard />
      </main>
    </div>
  );
};

export default Index;
