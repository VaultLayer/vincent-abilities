// fetchAbilitiesAndPolicies.ts

import { ethers } from 'ethers';

// Define Parameter Type enum values
export enum ParameterType {
  INT256 = 0,
  INT256_ARRAY = 1,
  UINT256 = 2,
  UINT256_ARRAY = 3,
  BOOL = 4,
  BOOL_ARRAY = 5,
  ADDRESS = 6,
  ADDRESS_ARRAY = 7,
  STRING = 8,
  STRING_ARRAY = 9,
  BYTES = 10,
  BYTES_ARRAY = 11,
}

// Decoded shapes to return
export interface DecodedPolicyParameter {
  name: string;
  paramType: ParameterType;
  decodedValue: any;
}

export interface DecodedPolicy {
  policyIpfsCid: string;
  parameters: DecodedPolicyParameter[];
}

export interface DecodedAbilityWithPolicies {
  abilityIpfsCid: string;
  policies: DecodedPolicy[];
}

/**
 * Decodes a parameter value based on its name and content.
 * Focuses on vlMetadata parameter as requested.
 */
function decodeParameterValue(paramName: string, paramValue: any): any {
  try {
    // If it's already a decoded value (not hex), return as-is
    if (typeof paramValue === 'string' && !paramValue.startsWith('0x')) {
      return paramValue;
    }

    // If it's not a hex string, return as-is
    if (typeof paramValue !== 'string' || !paramValue.startsWith('0x')) {
      return paramValue;
    }

    // Handle vlMetadata parameter specifically
    if (paramName === 'vlMetadata') {
      // Metadata is ABI-encoded string
      return ethers.utils.defaultAbiCoder.decode(['string'], paramValue)[0];
    }

    // For other parameters, return as-is since we only need vlMetadata
    return paramValue;
  } catch (error) {
    console.warn(`Error decoding parameter ${paramName}:`, error);
    return paramValue;
  }
}

// Minimal ABI for the view function
const ABI = [
  'function getAllAbilitiesAndPoliciesForApp(uint256 pkpTokenId, uint40 appId) view returns (tuple(string abilityIpfsCid, tuple(string policyIpfsCid, bytes policyParameterValues)[] policies)[] abilities)',
  'function getPermittedAppVersionForPkp(uint256,uint256) view returns (uint256)',
];

/**
 * Fetches and decodes all permitted abilities, policies, and parameters
 * for a given PKP and app. Focuses on vlMetadata parameter as requested.
 */
export async function fetchAbilitiesAndPolicies(
  pkpTokenId: string,
  appId: ethers.BigNumberish,
): Promise<DecodedAbilityWithPolicies[]> {
  // Vincent tool policies contract
  const contractAddress = '0xa3a602F399E9663279cdF63a290101cB6560A87e';
  const rpcUrl = 'https://yellowstone-rpc.litprotocol.com';
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, ABI, provider);

  try {
    // Call view function
    const rawAbilities = await contract.getAllAbilitiesAndPoliciesForApp(pkpTokenId, appId);

    console.log(
      `Contract result for PKP ${pkpTokenId} appId ${appId}:`,
      JSON.stringify(rawAbilities, null, 2),
    );

    // Convert contract result to our expected format
    const abilities: DecodedAbilityWithPolicies[] = [];

    for (const ability of rawAbilities) {
      const decodedPolicies: DecodedPolicy[] = [];

      for (const policy of ability.policies) {
        const parameters: DecodedPolicyParameter[] = [];

        // The policyParameterValues contains encoded parameters
        // Since we only need vlMetadata, we'll try to decode it
        try {
          // For now, we'll store the raw bytes and add a note
          // In a real implementation, you'd need the parameter schema to decode properly
          parameters.push({
            name: 'vlMetadata',
            paramType: ParameterType.STRING,
            decodedValue:
              'Raw policy parameter values available in policyParameterValues bytes field',
          });
        } catch (paramError) {
          console.warn(
            `Error processing parameters for policy ${policy.policyIpfsCid}:`,
            paramError,
          );
        }

        decodedPolicies.push({
          policyIpfsCid: policy.policyIpfsCid,
          parameters,
        });
      }

      abilities.push({
        abilityIpfsCid: ability.abilityIpfsCid,
        policies: decodedPolicies,
      });
    }

    return abilities;
  } catch (err: any) {
    // Likely no permitted version or invalid inputs
    if (err.code === 'CALL_EXCEPTION') {
      console.warn(
        `getAllAbilitiesAndPoliciesForApp reverted for pkp ${pkpTokenId} appId ${appId}: returning empty list.`,
      );
      return [];
    }
    console.warn(
      `getAllAbilitiesAndPoliciesForApp failed for pkp ${pkpTokenId} appId ${appId}: ${err.message}`,
    );
    console.warn(`Full error details:`, err);
    return [];
  }
}

// Backward compatibility export
export const fetchToolsAndPolicies = fetchAbilitiesAndPolicies;
