import { Button } from '@/components/ui/button';
import HyperVaultLogo from '@/components/HyperVaultLogo';

interface ConnectWalletProps {
  onConnect: () => void;
  vaultStats: { apy: number; totalDOT: number };
}

const ConnectWallet = ({ onConnect, vaultStats }: ConnectWalletProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Glow orbs */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-secondary/5 rounded-full blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center gap-10 max-w-lg px-6">
        <div className="animate-float">
          <HyperVaultLogo className="scale-150" />
        </div>

        <div className="text-center space-y-3">
          <h2 className="font-display text-4xl md:text-5xl text-foreground leading-tight">
            Native DOT Yield.
            <br />
            <span className="text-gradient">No Bridges.</span>
          </h2>
          <p className="font-mono text-sm text-muted-foreground max-w-md">
            Deposit DOT → Earn ~{vaultStats.apy}% APY via Bifrost vDOT → Withdraw DOT + yield. One contract, one ecosystem.
          </p>
        </div>

        <Button variant="vault" size="lg" className="px-12 py-6 text-sm" onClick={onConnect}>
          Connect Wallet
        </Button>

        <div className="flex items-center gap-6 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span>APY: ~{vaultStats.apy}%</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <span>TVL: {vaultStats.totalDOT.toLocaleString()} DOT</span>
          <div className="h-3 w-px bg-border" />
          <span>Powered by Bifrost</span>
        </div>
      </div>

      {/* Architecture hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-muted-foreground/40 tracking-widest uppercase">
        XCM · Polkadot Hub EVM · Solidity
      </div>
    </div>
  );
};

export default ConnectWallet;
