import { ethers } from 'ethers';

import { createVincentPolicy } from '@lit-protocol/vincent-ability-sdk';

import {
  evalAllowResultSchema,
  evalDenyResultSchema,
  precheckAllowResultSchema,
  precheckDenyResultSchema,
  abilityParamsSchema,
  userParamsSchema,
} from './schemas';

/**
 * Validates a contract call against the configured whitelist policy
 */
const validateContractCall = (
  abilityParams: {
    contractAddress: string;
    functionName: string;
    chain: string;
    value?: string;
    appendToCallData?: string;
  },
  userParams: {
    vlCallContractMaxValue: string;
    vlCallContractAllowedContracts: string[];
    vlCallContractAllowedFunctions: string[];
    vlCallContractAllowedChains: string[];
    vlCallContractAllowedCallDataPrefixes?: string[];
  },
): { allow: true } | { allow: false; reason: string } => {
  const { contractAddress, functionName, chain, value = '0', appendToCallData } = abilityParams;
  const {
    vlCallContractMaxValue,
    vlCallContractAllowedContracts,
    vlCallContractAllowedFunctions,
    vlCallContractAllowedChains,
    vlCallContractAllowedCallDataPrefixes,
  } = userParams;

  // Validate contract address if allowlist is not empty
  if (vlCallContractAllowedContracts.length > 0) {
    const normalizedContract = ethers.utils.getAddress(contractAddress);
    const normalizedAllowed = vlCallContractAllowedContracts.map((addr) =>
      ethers.utils.getAddress(addr),
    );

    if (!normalizedAllowed.includes(normalizedContract)) {
      return {
        allow: false,
        reason: `Contract ${normalizedContract} not allowed. Allowed contracts: ${normalizedAllowed.join(', ')}`,
      };
    }
  }

  // Validate function name if allowlist is not empty
  if (vlCallContractAllowedFunctions.length > 0) {
    if (!vlCallContractAllowedFunctions.includes(functionName)) {
      return {
        allow: false,
        reason: `Function ${functionName} not allowed. Allowed functions: ${vlCallContractAllowedFunctions.join(', ')}`,
      };
    }
  }

  // Validate chain if allowlist is not empty
  if (vlCallContractAllowedChains.length > 0) {
    if (!vlCallContractAllowedChains.includes(chain)) {
      return {
        allow: false,
        reason: `Chain ${chain} not allowed. Allowed chains: ${vlCallContractAllowedChains.join(', ')}`,
      };
    }
  }

  // Validate value against max value
  try {
    const valueBN = ethers.BigNumber.from(value);
    const maxValueBN = ethers.BigNumber.from(vlCallContractMaxValue);

    if (valueBN.gt(maxValueBN)) {
      return {
        allow: false,
        reason: `Transaction value ${ethers.utils.formatEther(valueBN)} ETH exceeds max allowed ${ethers.utils.formatEther(maxValueBN)} ETH`,
      };
    }
  } catch (error) {
    return {
      allow: false,
      reason: `Invalid value format: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // Validate appendToCallData against allowed prefixes if provided
  if (appendToCallData && vlCallContractAllowedCallDataPrefixes) {
    const cleanAppendData = appendToCallData.startsWith('0x')
      ? appendToCallData.slice(2)
      : appendToCallData;

    // Check if it starts with any allowed prefix
    const hasValidPrefix = vlCallContractAllowedCallDataPrefixes.some((prefix) => {
      const cleanPrefix = prefix.startsWith('0x') ? prefix.slice(2) : prefix;
      return cleanAppendData.toLowerCase().startsWith(cleanPrefix.toLowerCase());
    });

    if (!hasValidPrefix) {
      return {
        allow: false,
        reason: `appendToCallData must start with one of the allowed prefixes: ${vlCallContractAllowedCallDataPrefixes.join(', ')}. Provided: ${appendToCallData}`,
      };
    }
  }

  return { allow: true };
};

export const vincentPolicy = createVincentPolicy({
  packageName: '@vaultlayer/vincent-policy-call-contract-whitelist' as const,

  abilityParamsSchema,
  userParamsSchema,

  precheckAllowResultSchema,
  precheckDenyResultSchema,

  evalAllowResultSchema,
  evalDenyResultSchema,

  precheck: async ({ abilityParams, userParams }, { allow, deny }) => {
    try {
      // Validate required fields in ability params
      if (!abilityParams.contractAddress || !abilityParams.functionName || !abilityParams.chain) {
        return deny({
          reason: 'Missing required fields: contractAddress, functionName, or chain',
        });
      }

      // Validate required fields in user params
      if (
        !userParams.vlCallContractMaxValue ||
        !userParams.vlCallContractAllowedContracts ||
        !userParams.vlCallContractAllowedFunctions ||
        !userParams.vlCallContractAllowedChains
      ) {
        return deny({
          reason: 'Missing required policy configuration fields',
        });
      }

      const validation = validateContractCall(
        {
          contractAddress: abilityParams.contractAddress,
          functionName: abilityParams.functionName,
          chain: abilityParams.chain,
          value: abilityParams.value,
          appendToCallData: abilityParams.appendToCallData,
        },
        {
          vlCallContractMaxValue: userParams.vlCallContractMaxValue,
          vlCallContractAllowedContracts: userParams.vlCallContractAllowedContracts,
          vlCallContractAllowedFunctions: userParams.vlCallContractAllowedFunctions,
          vlCallContractAllowedChains: userParams.vlCallContractAllowedChains,
          vlCallContractAllowedCallDataPrefixes: userParams.vlCallContractAllowedCallDataPrefixes,
        },
      );

      if (!validation.allow) {
        const deniedValidation = validation as { allow: false; reason: string };
        return deny({
          reason: deniedValidation.reason,
          contractAddress: abilityParams.contractAddress,
          functionName: abilityParams.functionName,
          chain: abilityParams.chain,
          value: abilityParams.value || '0',
        });
      }

      return allow({
        contractAddress: abilityParams.contractAddress,
        functionName: abilityParams.functionName,
        chain: abilityParams.chain,
        value: abilityParams.value || '0',
        appendToCallDataValidated: !!abilityParams.appendToCallData,
      });
    } catch (error) {
      console.error('Precheck error:', error);
      return deny({
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  evaluate: async ({ abilityParams, userParams }, { allow, deny }) => {
    try {
      // Validate required fields in ability params
      if (!abilityParams.contractAddress || !abilityParams.functionName || !abilityParams.chain) {
        return deny({
          reason: 'Missing required fields: contractAddress, functionName, or chain',
        });
      }

      // Validate required fields in user params
      if (
        !userParams.vlCallContractMaxValue ||
        !userParams.vlCallContractAllowedContracts ||
        !userParams.vlCallContractAllowedFunctions ||
        !userParams.vlCallContractAllowedChains
      ) {
        return deny({
          reason: 'Missing required policy configuration fields',
        });
      }

      const validation = validateContractCall(
        {
          contractAddress: abilityParams.contractAddress,
          functionName: abilityParams.functionName,
          chain: abilityParams.chain,
          value: abilityParams.value,
          appendToCallData: abilityParams.appendToCallData,
        },
        {
          vlCallContractMaxValue: userParams.vlCallContractMaxValue,
          vlCallContractAllowedContracts: userParams.vlCallContractAllowedContracts,
          vlCallContractAllowedFunctions: userParams.vlCallContractAllowedFunctions,
          vlCallContractAllowedChains: userParams.vlCallContractAllowedChains,
          vlCallContractAllowedCallDataPrefixes: userParams.vlCallContractAllowedCallDataPrefixes,
        },
      );

      if (!validation.allow) {
        const deniedValidation = validation as { allow: false; reason: string };
        return deny({
          reason: deniedValidation.reason,
          contractAddress: abilityParams.contractAddress,
          functionName: abilityParams.functionName,
          chain: abilityParams.chain,
          value: abilityParams.value || '0',
        });
      }

      return allow({
        contractAddress: abilityParams.contractAddress,
        functionName: abilityParams.functionName,
        chain: abilityParams.chain,
        value: abilityParams.value || '0',
        appendToCallDataValidated: !!abilityParams.appendToCallData,
      });
    } catch (error) {
      console.error('Evaluate error:', error);
      return deny({
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
});
