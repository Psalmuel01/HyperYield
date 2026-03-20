import { VaultState, UserPosition } from '@/hooks/use-vault';

interface VaultStatsBarProps {
  vaultState: VaultState;
  userPosition: UserPosition;
}

const StatItem = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">{label}</span>
    <span className={`text-lg font-mono font-semibold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</span>
  </div>
);

const VaultStatsBar = ({ vaultState, userPosition }: VaultStatsBarProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <StatItem label="Total Value Locked" value={`${vaultState.totalDOT.toLocaleString(undefined, { maximumFractionDigits: 1 })} DOT`} />
        <StatItem label="Share Price" value={`${vaultState.sharePrice.toFixed(4)} DOT`} />
        <StatItem label="APY" value={`${vaultState.apy}%`} accent />
        <StatItem label="Depositors" value={vaultState.userCount.toString()} />
        <StatItem label="Your Position" value={userPosition.dotValue > 0 ? `${userPosition.dotValue.toFixed(2)} DOT` : '—'} />
      </div>
    </div>
  );
};

export default VaultStatsBar;
