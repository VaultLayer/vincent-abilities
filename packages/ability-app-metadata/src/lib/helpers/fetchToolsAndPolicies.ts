// fetchToolsAndPolicies.ts

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

// Raw types matching the Solidity structs
interface RawPolicyParameter {
  name: string;
  paramType: number;
  value: string; // hex string
}

interface RawPolicyWithParameters {
  policyIpfsCid: string;
  parameters: RawPolicyParameter[];
}

interface RawToolWithPolicies {
  toolIpfsCid: string;
  policies: RawPolicyWithParameters[];
}

// Decoded shapes to return
export interface DecodedPolicyParameter {
  name: string;
  paramType: ParameterType;
  rawValue: string;
  decodedValue: any;
}

export interface DecodedPolicy {
  policyIpfsCid: string;
  parameters: DecodedPolicyParameter[];
}

export interface DecodedToolWithPolicies {
  toolIpfsCid: string;
  policies: DecodedPolicy[];
}

/**
 * Decodes a single on‑chain policy parameter value based on its type.
 * @param encodedValue Hex string or bytes representing the encoded parameter
 * @param paramType Numeric enum from ParameterType
 * @returns Decoded primitive or string/array, or raw hex if unknown
 */
export function decodeParameterValue(
  encodedValue: string,
  paramType: number,
): string | boolean | string[] {
  try {
    switch (paramType) {
      case ParameterType.INT256:
        return ethers.utils.defaultAbiCoder.decode(['int256'], encodedValue)[0].toString();

      case ParameterType.UINT256:
        return ethers.utils.defaultAbiCoder.decode(['uint256'], encodedValue)[0].toString();

      case ParameterType.BOOL:
        return ethers.utils.defaultAbiCoder.decode(['bool'], encodedValue)[0];

      case ParameterType.ADDRESS:
        return ethers.utils.defaultAbiCoder.decode(['address'], encodedValue)[0];

      case ParameterType.STRING:
        return ethers.utils.defaultAbiCoder.decode(['string'], encodedValue)[0];

      case ParameterType.INT256_ARRAY:
        return ethers.utils.defaultAbiCoder
          .decode(['int256[]'], encodedValue)[0]
          .map((v: any) => v.toString());

      case ParameterType.UINT256_ARRAY:
        return ethers.utils.defaultAbiCoder
          .decode(['uint256[]'], encodedValue)[0]
          .map((v: any) => v.toString());

      case ParameterType.BOOL_ARRAY:
        return ethers.utils.defaultAbiCoder.decode(['bool[]'], encodedValue)[0];

      case ParameterType.ADDRESS_ARRAY:
        return ethers.utils.defaultAbiCoder.decode(['address[]'], encodedValue)[0];

      case ParameterType.STRING_ARRAY:
        return ethers.utils.defaultAbiCoder.decode(['string[]'], encodedValue)[0];

      case ParameterType.BYTES:
        return ethers.utils.hexlify(encodedValue);

      case ParameterType.BYTES_ARRAY:
        return ethers.utils.defaultAbiCoder
          .decode(['bytes[]'], encodedValue)[0]
          .map((b: any) => ethers.utils.hexlify(b));

      default:
        // Unknown type: return raw hex
        return ethers.utils.hexlify(encodedValue);
    }
  } catch (error) {
    console.error('Error decoding parameter value:', { encodedValue, paramType, error });
    return '';
  }
}

// Minimal ABI for the view function
const ABI = [
  'function getAllToolsAndPoliciesForApp(uint256 pkpTokenId, uint256 appId) view returns (tuple(string toolIpfsCid, tuple(string policyIpfsCid, tuple(string name, uint8 paramType, bytes value)[] parameters)[] policies)[] tools)',
  'function getPermittedAppVersionForPkp(uint256,uint256) view returns (uint256)',
];

/**
 * Fetches and decodes all permitted tools, policies, and parameters
 * for a given PKP and app.
 */
export async function fetchToolsAndPolicies(
  pkpTokenId: string,
  appId: ethers.BigNumberish,
): Promise<DecodedToolWithPolicies[]> {
  //VINCENT_TOOL_POLICIES_CONTRACT
  const contractAddress = '0x78Cd1d270Ff12BA55e98BDff1f3646426E25D932';
  const rpcUrl = 'https://yellowstone-rpc.litprotocol.com';
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, ABI, provider);

  // Call view function
  let rawTools: RawToolWithPolicies[];
  try {
    rawTools = await contract.getAllToolsAndPoliciesForApp(pkpTokenId, appId);
  } catch (err: any) {
    // Likely no permitted version or invalid inputs
    if (err.code === 'CALL_EXCEPTION') {
      console.warn(
        `getAllToolsAndPoliciesForApp reverted for pkp ${pkpTokenId} appId ${appId}: returning empty list.`,
      );
      return [];
    }
    throw err;
  }

  // Decode parameters
  return rawTools.map((tool) => ({
    toolIpfsCid: tool.toolIpfsCid,
    policies: tool.policies.map((policy) => ({
      policyIpfsCid: policy.policyIpfsCid,
      parameters: policy.parameters.map((param) => {
        const rawHex = ethers.utils.hexlify(param.value);
        return {
          name: param.name,
          paramType: param.paramType as ParameterType,
          rawValue: rawHex,
          decodedValue: decodeParameterValue(rawHex, param.paramType),
        };
      }),
    })),
  }));
}
