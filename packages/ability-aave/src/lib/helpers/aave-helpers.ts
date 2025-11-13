import type { AaveChain } from '../config';

import { AAVE_CONFIG } from '../config';

// Try to import Aave address book, but don't fail if it's not available
let chainModules: Record<string, any> = {};
try {
   
  const {
    AaveV3Ethereum,
    AaveV3Arbitrum,
    AaveV3Base,
    AaveV3Polygon,
    AaveV3Optimism,
  } = require('@bgd-labs/aave-address-book');
  chainModules = {
    ethereum: AaveV3Ethereum,
    arbitrum: AaveV3Arbitrum,
    base: AaveV3Base,
    polygon: AaveV3Polygon,
    optimism: AaveV3Optimism,
  };
} catch (error) {
  // Address book not available, will use config fallback
  console.warn('@bgd-labs/aave-address-book not available, using config fallback');
}

// Colend (CoreDAO) asset mappings - Updated with complete protocol data
const COLEND_ASSETS = {
  // Core assets
  CORE: {
    UNDERLYING: '0xBc3c48E10e6EeCa877E82d17baA0cA6AE5D0a153',
    A_TOKEN: '0x46F9ce2B0aD0632858580eF66912D3F58a993571',
    STABLE_DEBT_TOKEN: '0x0000000000000000000000000000000000000000', // Not available
    V_TOKEN: '0x0000000000000000000000000000000000000000', // Not available
    DECIMALS: 18,
  },
  CLND: {
    UNDERLYING: '0x30A540B05468A250fCc17Da2D9D4aaa84B358eA7',
    A_TOKEN: '0xbFF5dE60A0dC1292610A300086C9f8Da3bE9E9b8', // cCOLEND
    STABLE_DEBT_TOKEN: '0x0000000000000000000000000000000000000000', // Not available
    V_TOKEN: '0x0000000000000000000000000000000000000000', // Not available
    DECIMALS: 18,
  },

  // Stablecoins
  USDC: {
    UNDERLYING: '0xa4151B2B3e269645181dCcF2D426cE75fcbDeca9',
    A_TOKEN: '0x8f9d6649C4ac1d894BB8A26c3eed8f1C9C5f82Dd', // aCoreUSDC
    STABLE_DEBT_TOKEN: '0x0000000000000000000000000000000000000000', // Not available
    V_TOKEN: '0x6e4DF18dff9a577f7B1583B71888F45CacBa5d42', // variableDebtCoreUSDC proxy
    DECIMALS: 6,
  },
  // Wrapped assets
  WCORE: {
    UNDERLYING: '0x40375C92d9FAf44d2f9db9Bd9ba41a3317a2404f',
    A_TOKEN: '0xf06C8db5f143fC9359d6af8BD07Adc845d2F3EF8', // aCoreWCORE
    STABLE_DEBT_TOKEN: '0x0000000000000000000000000000000000000000', // Not available
    V_TOKEN: '0xAc98BB397b8ba98FffDd0124Cdc50fA08d7C7a00', // variableDebtCoreWCORE proxy
    DECIMALS: 18,
  },
  STCORE: {
    UNDERLYING: '0xb3A8F0f0da9ffC65318aA39E55079796093029AD',
    A_TOKEN: '0x9e99442AF8eaE003038Cbd0D36d60A0cA7a0fBDe', // cSTCORE
    STABLE_DEBT_TOKEN: '0x0000000000000000000000000000000000000000', // Not available
    V_TOKEN: '0x0000000000000000000000000000000000000000', // Not available
    DECIMALS: 18,
  },
} as const;

function getModule(chain: AaveChain) {
  if (chain === 'coreDao') {
    return null; // Colend doesn't use the standard Aave address book
  }
  const mod = chainModules[chain];
  if (!mod) {
    // For chains not in the address book, we'll use our config
    return null;
  }
  return mod;
}

export function getAavePoolAddress(chain: AaveChain): string {
  if (chain === 'coreDao') {
    return '0x0CEa9F0F49F30d376390e480ba32f903B43B19C5'; // Colend Pool-Proxy
  }
  const mod = getModule(chain);
  if (!mod) {
    // For chains not in address book, use our config
    return AAVE_CONFIG[chain].poolAddress;
  }
  // Pool proxy address
  return mod.POOL;
}

export function getAaveDataProviderAddress(chain: AaveChain): string {
  if (chain === 'coreDao') {
    return '0x567AF83d912C85c7a66d093e41D92676fA9076E3'; // Colend PoolDataProvider
  }
  const mod = getModule(chain);
  if (!mod) {
    // For chains not in address book, use our config
    return AAVE_CONFIG[chain].dataProvider || '';
  }
  const dp = (mod as any).POOL_DATA_PROVIDER || (mod as any).AAVE_PROTOCOL_DATA_PROVIDER;
  if (!dp) throw new Error(`No Data Provider found for ${chain}`);
  return dp as string;
}

export interface AaveAssetInfo {
  underlying: string;
  aToken?: string;
  stableDebtToken?: string;
  variableDebtToken?: string;
  decimals?: number;
}

export function getAaveAssetBySymbol(chain: AaveChain, symbol: string): AaveAssetInfo | null {
  if (chain === 'coreDao') {
    // Handle Colend assets
    const assetKey = Object.keys(COLEND_ASSETS).find(
      (k) => k.toUpperCase() === symbol.toUpperCase(),
    );
    if (!assetKey) return null;
    const asset = (COLEND_ASSETS as any)[assetKey];
    return {
      underlying: asset.UNDERLYING,
      aToken:
        asset.A_TOKEN !== '0x0000000000000000000000000000000000000000' ? asset.A_TOKEN : undefined,
      stableDebtToken:
        asset.STABLE_DEBT_TOKEN !== '0x0000000000000000000000000000000000000000'
          ? asset.STABLE_DEBT_TOKEN
          : undefined,
      variableDebtToken:
        asset.V_TOKEN !== '0x0000000000000000000000000000000000000000' ? asset.V_TOKEN : undefined,
      decimals: asset.DECIMALS,
    };
  }

  const mod = getModule(chain);
  if (!mod) return null;
  const assets = (mod as any).ASSETS || {};
  const key = Object.keys(assets).find((k) => k.toUpperCase() === symbol.toUpperCase());
  if (!key) return null;
  const asset = (assets as any)[key];
  return {
    underlying: asset.UNDERLYING,
    aToken: asset.A_TOKEN,
    stableDebtToken: asset.STABLE_DEBT_TOKEN,
    variableDebtToken: asset.V_TOKEN,
    decimals: asset.DECIMALS || 18, // Default to 18 if not specified
  };
}
