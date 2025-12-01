// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import AirIDL from '../target/idl/air.json'
import type { Air } from '../target/types/air'

// Re-export the generated IDL and type
export { Air, AirIDL }

// The programId is imported from the program IDL.
export const AIR_PROGRAM_ID = new PublicKey(AirIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getAirProgram(provider: AnchorProvider, address?: PublicKey): Program<Air> {
  return new Program({ ...AirIDL, address: address ? address.toBase58() : AirIDL.address } as Air, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getAirProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('CbKmdPJW2U9g2XWqXzgq46DieLjSdFqmkTqu9rS6xAiD')
    case 'mainnet-beta':
    default:
      return AIR_PROGRAM_ID
  }
}
