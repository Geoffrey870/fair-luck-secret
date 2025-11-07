import { Button } from "@/components/ui/button";
import { Plus, User, LogOut } from "lucide-react";
import raffleLogo from "@/assets/raffle-logo.svg";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <img src={raffleLogo} alt="Raffle Logo" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-foreground">FHE Raffle</h1>
              <p className="text-xs text-muted-foreground">Fair Luck, Protected by FHE.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected && address ? (
              <>
                <Button onClick={() => navigate("/create-raffle")} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Raffle
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <User className="w-4 h-4" />
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate("/my-raffles")}>
                      My Raffles
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <ConnectButton showBalance={false} />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
