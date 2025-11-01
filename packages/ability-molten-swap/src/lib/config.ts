export interface TokenInfo {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
}

export interface MoltenSwapConfig {
  version: string;
  chainId: number;
  rpcUrl: string;
  scanUrl: string;
  factory: string;
  router: string;
  quoter: string;
  nonfungiblePositionManager: string;
  tokens: {
    [key: string]: TokenInfo;
  };
}

export const moltenSwapConfig: MoltenSwapConfig = {
  version: 'v4',
  chainId: 1116,
  rpcUrl: 'https://rpc.coredao.org',
  scanUrl: 'https://scan.coredao.org',
  factory: '0x74EfE55beA4988e7D92D03EFd8ddB8BF8b7bD597',
  router: '0x832933BA44658C50ae6152039Cd30A6f4C2432b1',
  quoter: '0x20dA24b5FaC067930Ced329A3457298172510Fe7',
  nonfungiblePositionManager: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  tokens: {
    // Address-based access (for programmatic use)
    '0x900101d06a7426441ae63e9ab3b9b0f63be145f1': {
      name: 'USDT',
      address: '0x900101d06a7426441ae63e9ab3b9b0f63be145f1',
      symbol: 'USDT',
      decimals: 6,
    },
    '0xa4151b2b3e269645181dccf2d426ce75fcbdeca9': {
      name: 'USDC',
      address: '0xa4151b2b3e269645181dccf2d426ce75fcbdeca9',
      symbol: 'USDC',
      decimals: 6,
    },
    '0x5832f53d147b3d6cd4578b9cbd62425c7ea9d0bd': {
      name: 'Wrapped BTC',
      address: '0x5832f53d147b3d6cd4578b9cbd62425c7ea9d0bd',
      symbol: 'wBTC',
      decimals: 8,
    },
    '0x191e94fa59739e188dce837f7f6978d84727ad01': {
      name: 'Wrapped CORE',
      address: '0x191e94fa59739e188dce837f7f6978d84727ad01',
      symbol: 'wCORE',
      decimals: 18,
    },
    '0x3093304eCE0F35969B580CbD155a1357829870f2': {
      name: 'vltCORE',
      address: '0x3093304eCE0F35969B580CbD155a1357829870f2',
      symbol: 'vltCORE',
      decimals: 18,
    },
    '0xB28B43209d9de61306172Af0320f4f55e50E2f29': {
      name: 'ASX',
      address: '0xB28B43209d9de61306172Af0320f4f55e50E2f29',
      symbol: 'ASX',
      decimals: 18,
    },
    // Symbol-based access (for convenience)
    USDT: {
      name: 'USDT',
      address: '0x900101d06a7426441ae63e9ab3b9b0f63be145f1',
      symbol: 'USDT',
      decimals: 6,
    },
    USDC: {
      name: 'USDC',
      address: '0xa4151b2b3e269645181dccf2d426ce75fcbdeca9',
      symbol: 'USDC',
      decimals: 6,
    },
    wBTC: {
      name: 'Wrapped BTC',
      address: '0x5832f53d147b3d6cd4578b9cbd62425c7ea9d0bd',
      symbol: 'wBTC',
      decimals: 8,
    },
    wCORE: {
      name: 'Wrapped CORE',
      address: '0x191e94fa59739e188dce837f7f6978d84727ad01',
      symbol: 'wCORE',
      decimals: 18,
    },
    vltCORE: {
      name: 'vltCORE',
      address: '0x3093304eCE0F35969B580CbD155a1357829870f2',
      symbol: 'vltCORE',
      decimals: 18,
    },
    ASX: {
      name: 'ASX',
      address: '0xB28B43209d9de61306172Af0320f4f55e50E2f29',
      symbol: 'ASX',
      decimals: 18,
    },
  },
};
