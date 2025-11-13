export type AaveChain =
  | 'ethereum'
  | 'arbitrum'
  | 'base'
  | 'polygon'
  | 'optimism'
  | 'bsc'
  | 'avalanche'
  | 'coreDao';

export interface AaveConfig {
  chainId: number;
  rpcUrl: string;
  scanUrl: string;
  poolAddress: string; // IPool proxy
  dataProvider?: string; // AaveProtocolDataProvider (optional)
}

// Updated with correct production addresses for all supported chains
export const AAVE_CONFIG: Record<AaveChain, AaveConfig> = {
  ethereum: {
    chainId: 1,
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    scanUrl: 'https://etherscan.io',
    poolAddress: '0x87870Bca3F3fD6335C3F4ce8392D69150Ee82ab8', // Aave V3 Pool Proxy
    dataProvider: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3', // Aave V3 Data Provider
  },
  arbitrum: {
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    scanUrl: 'https://arbiscan.io',
    poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Pool Proxy
    dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654', // Aave V3 Data Provider
  },
  base: {
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    scanUrl: 'https://basescan.org',
    poolAddress: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // Aave V3 Pool Proxy
    dataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac', // Aave V3 Data Provider
  },
  polygon: {
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    scanUrl: 'https://polygonscan.com',
    poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Pool Proxy
    dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654', // Aave V3 Data Provider
  },
  optimism: {
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    scanUrl: 'https://optimistic.etherscan.io',
    poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Pool Proxy
    dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654', // Aave V3 Data Provider
  },
  bsc: {
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    scanUrl: 'https://bscscan.com',
    poolAddress: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB', // Aave V3 Pool Proxy
    dataProvider: '0xc90Df74A7c16245c5F5C5870327Ceb38Fe5d5328', // Aave V3 Data Provider
  },
  avalanche: {
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    scanUrl: 'https://snowtrace.io',
    poolAddress: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Pool Proxy
    dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654', // Aave V3 Data Provider
  },
  coreDao: {
    chainId: 1116,
    rpcUrl: 'https://rpc.coredao.org',
    scanUrl: 'https://scan.coredao.org',
    poolAddress: '0x0CEa9F0F49F30d376390e480ba32f903B43B19C5', // Colend Pool-Proxy
    dataProvider: '0x567AF83d912C85c7a66d093e41D92676fA9076E3', // Colend PoolDataProvider
  },
};

export function getAaveConfig(chain: AaveChain): AaveConfig {
  const cfg = AAVE_CONFIG[chain];
  if (!cfg || cfg.poolAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(
      `Aave config for ${chain} is not set. Please update AAVE_CONFIG with correct addresses.`,
    );
  }
  return cfg;
}
