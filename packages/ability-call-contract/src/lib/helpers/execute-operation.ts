import type { ethers } from 'ethers';

import { laUtils } from '@lit-protocol/vincent-scaffold-sdk';

/**
 * Generic function to execute any contract call operation, with optional gas sponsorship
 */
export async function executeOperation({
  provider,
  pkpPublicKey,
  callerAddress,
  contractAddress,
  functionName,
  functionAbi,
  args,
  chainId,
  value = '0',
  appendToCallData,
  alchemyGasSponsor,
  alchemyGasSponsorApiKey,
  alchemyGasSponsorPolicyId,
}: {
  provider?: ethers.providers.JsonRpcProvider;
  pkpPublicKey: string;
  callerAddress: string;
  contractAddress: string;
  functionName: string;
  functionAbi: string;
  args: unknown[];
  chainId: number;
  value?: string;
  appendToCallData?: string;
  alchemyGasSponsor?: boolean;
  alchemyGasSponsorApiKey?: string;
  alchemyGasSponsorPolicyId?: string;
}): Promise<string> {
  console.log(
    `[@vaultlayer/vincent-ability-call-contract/executeOperation] Starting ${functionName} operation`,
    { sponsored: !!alchemyGasSponsor },
  );

  // Prepare the ABI array
  const abi = [functionAbi];

  // Note: appendToCallData feature is not currently implemented with SDK methods
  // The SDK's contractCall and sponsoredGasContractCall handle encoding internally
  if (appendToCallData) {
    console.warn(
      `[@lit-protocol/vincent-ability-call-contract/executeOperation] appendToCallData is not supported with SDK methods`,
    );
  }

  // Use gas sponsorship if enabled and all required parameters are provided
  if (alchemyGasSponsor && alchemyGasSponsorApiKey && alchemyGasSponsorPolicyId) {
    console.log(
      `[@vaultlayer/vincent-ability-call-contract/executeOperation] Using EIP-7702 gas sponsorship`,
      {
        callerAddress,
        contractAddress,
        functionName,
        args,
        value,
        policyId: alchemyGasSponsorPolicyId,
      },
    );

    try {
      return await laUtils.transaction.handler.sponsoredGasContractCall({
        pkpPublicKey,
        abi,
        contractAddress,
        functionName,
        args,
        chainId,
        overrides: {
          value,
        },
        eip7702AlchemyApiKey: alchemyGasSponsorApiKey,
        eip7702AlchemyPolicyId: alchemyGasSponsorPolicyId,
      });
    } catch (error) {
      console.error(
        `[@vaultlayer/vincent-ability-call-contract/executeOperation] EIP-7702 operation failed:`,
        error,
      );
      throw error;
    }
  } else {
    // Use regular transaction without gas sponsorship
    console.log(
      `[@vaultlayer/vincent-ability-call-contract/executeOperation] Using regular transaction`,
    );

    if (!provider) {
      throw new Error('Provider is required for non-sponsored transactions');
    }

    try {
      return await laUtils.transaction.handler.contractCall({
        provider,
        pkpPublicKey,
        callerAddress,
        abi,
        contractAddress,
        functionName,
        args,
        chainId,
        overrides: {
          value,
        },
      });
    } catch (error) {
      console.error(
        `[@vaultlayer/vincent-ability-call-contract/executeOperation] Regular transaction failed:`,
        error,
      );
      throw error;
    }
  }
}
