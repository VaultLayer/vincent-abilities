import type { ethers } from 'ethers';

export type CheckNativeTokenBalanceResult =
  | CheckNativeTokenBalanceResultSuccess
  | CheckNativeTokenBalanceResultFailure;

export interface CheckNativeTokenBalanceResultSuccess {
  success: true;
  ethBalance: ethers.BigNumber;
}

export interface CheckNativeTokenBalanceResultFailure {
  success: false;
  reason: string;
}

export type CheckErc20BalanceResult =
  | CheckErc20BalanceResultSuccess
  | CheckErc20BalanceResultFailure;

interface CheckErc20BalanceResultBase {
  tokenAddress: string;
  requiredTokenAmount: ethers.BigNumber;
  tokenBalance: ethers.BigNumber;
}

export interface CheckErc20BalanceResultSuccess extends CheckErc20BalanceResultBase {
  success: true;
}

export interface CheckErc20BalanceResultFailure extends CheckErc20BalanceResultBase {
  success: false;
  reason: string;
}

export type CheckErc20AllowanceResult =
  | CheckErc20AllowanceResultSuccess
  | CheckErc20AllowanceResultFailure;

interface CheckErc20AllowanceResultBase {
  spenderAddress: string;
  tokenAddress: string;
  requiredAllowance: ethers.BigNumber;
  currentAllowance: ethers.BigNumber;
}

export interface CheckErc20AllowanceResultSuccess extends CheckErc20AllowanceResultBase {
  success: true;
}

export interface CheckErc20AllowanceResultFailure extends CheckErc20AllowanceResultBase {
  success: false;
  reason: string;
}

export enum AbilityAction {
  Bridge = 'bridge',
  Approve = 'approve',
}

export interface ThorInboundAddress {
  chain: string;
  router: string;
  address: string;
  halted: boolean;
}

export interface ThorQuoteResponse {
  memo: string;
  expected_amount_out: string;
  fees: {
    asset: string;
    affiliate: string;
    outbound: string;
  };
  inbound_address: string;
  inbound_confirmation_blocks?: number;
  inbound_confirmation_seconds?: number;
  outbound_delay_blocks?: number;
  outbound_delay_seconds?: number;
  total_swap_seconds?: number;
  warning?: string;
  notes?: string;
  slippage_bps?: number;
}
