'use client'

import { getAirProgram, getAirProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import BN from 'bn.js'

interface InitializeRegistryArgs {
  payerPubkey: PublicKey
}

interface CreateListingArgs {
  ownerPubkey: PublicKey
  latitude: number
  longitude: number
  heightFrom: number
  heightTo: number
  areaSqm: number
  price: BN
  listingType: 'sale' | 'lease'
  durationDays: number
  city: string
  country: string
  metadataUri: string
}

interface UpdatePriceArgs {
  listingPubkey: PublicKey
  ownerPubkey: PublicKey
  newPrice: BN
}

interface PurchaseAirRightsArgs {
  listingPubkey: PublicKey
  buyerPubkey: PublicKey
  sellerPubkey: PublicKey
  platformTreasuryPubkey: PublicKey
}

interface LeaseAirRightsArgs {
  listingPubkey: PublicKey
  lesseePubkey: PublicKey
  lessorPubkey: PublicKey
  platformTreasuryPubkey: PublicKey
  listingId: BN
}

interface CancelListingArgs {
  listingPubkey: PublicKey
  ownerPubkey: PublicKey
  city: string
  country: string
}

export function useAirTradeProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getAirProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getAirProgram(provider, programId), [provider, programId])

  const registryAccounts = useQuery({
    queryKey: ['registry', 'all', { cluster }],
    queryFn: () => program.account.registry.all(),
  })

  const leaseRecordAccounts = useQuery({
    queryKey: ['leaseRecord', 'all', { cluster }],
    queryFn: () => program.account.leaseRecord.all(),
  })

  const listingAccounts = useQuery({
    queryKey: ['listing', 'all', { cluster }],
    queryFn: () => program.account.listing.all(),
  })

  const locationIndexAccounts = useQuery({
    queryKey: ['locationIndex', 'all', { cluster }],
    queryFn: () => program.account.locationIndex.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initializeRegistryHandler = useMutation<string, Error, InitializeRegistryArgs>({
    mutationKey: ['registry', 'initialize', { cluster }],
    mutationFn: async ({ payerPubkey }) => {
      const [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      )

      return await program.methods
        .initializeRegistry()
        .accountsStrict({ 
          authority: payerPubkey,
          registry: registryPda,
          systemProgram: SystemProgram.programId
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await registryAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to initialize registry account')
    },
  })

  const createListingHandler = useMutation<string, Error, CreateListingArgs>({
    mutationKey: ['listing', 'create', { cluster }],
    mutationFn: async ({
      ownerPubkey,
      latitude,
      longitude,
      heightFrom,
      heightTo,
      areaSqm,
      price,
      listingType,
      durationDays,
      city,
      country,
      metadataUri
    }) => {
      const [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      )

      const registry = await program.account.registry.fetch(registryPda)

      const [listingPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("listing"),
          registry.totalListings.toArrayLike(Buffer, 'le', 8)
        ],
        program.programId
      )

      const [locationIndexPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("location"),
          Buffer.from(city),
          Buffer.from(country)
        ],
        program.programId
      )

      const listingTypeEnum = listingType === 'sale' ? { sale: {} } : { lease: {} }

      return await program.methods
        .createListing(
          latitude,
          longitude,
          heightFrom,
          heightTo,
          areaSqm,
          price,
          listingTypeEnum,
          durationDays,
          city,
          country,
          metadataUri
        )
        .accountsStrict({
          listing: listingPda,
          registry: registryPda,
          locationIndex: locationIndexPda,
          owner: ownerPubkey,
          systemProgram: SystemProgram.programId
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await Promise.all([
        registryAccounts.refetch(),
        listingAccounts.refetch(),
        locationIndexAccounts.refetch()
      ])
    },
    onError: (error) => {
      toast.error(`Failed to create listing: ${error.message}`)
    },
  })

  const updatePriceHandler = useMutation<string, Error, UpdatePriceArgs>({
    mutationKey: ['listing', 'updatePrice', { cluster }],
    mutationFn: async ({ listingPubkey, ownerPubkey, newPrice }) => {
      return await program.methods
        .updatePrice(newPrice)
        .accountsStrict({
          listing: listingPubkey,
          owner: ownerPubkey
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await listingAccounts.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to update price: ${error.message}`)
    },
  })

  const purchaseAirRightsHandler = useMutation<string, Error, PurchaseAirRightsArgs>({
    mutationKey: ['listing', 'purchase', { cluster }],
    mutationFn: async ({ listingPubkey, buyerPubkey, sellerPubkey, platformTreasuryPubkey }) => {
      const [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      )

      return await program.methods
        .purchaseAirRights()
        .accountsStrict({
          listing: listingPubkey,
          registry: registryPda,
          buyer: buyerPubkey,
          seller: sellerPubkey,
          platformTreasury: platformTreasuryPubkey,
          systemProgram: SystemProgram.programId
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await listingAccounts.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to purchase air rights: ${error.message}`)
    },
  })

  const leaseAirRightsHandler = useMutation<string, Error, LeaseAirRightsArgs>({
    mutationKey: ['listing', 'lease', { cluster }],
    mutationFn: async ({
      listingPubkey,
      lesseePubkey,
      lessorPubkey,
      platformTreasuryPubkey,
      listingId
    }) => {
      const [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      )

      const [leaseRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("lease"),
          listingId.toArrayLike(Buffer, 'le', 8),
          lesseePubkey.toBuffer()
        ],
        program.programId
      )

      return await program.methods
        .leaseAirRights()
        .accountsStrict({
          listing: listingPubkey,
          registry: registryPda,
          leaseRecord: leaseRecordPda,
          lessee: lesseePubkey,
          lessor: lessorPubkey,
          platformTreasury: platformTreasuryPubkey,
          systemProgram: SystemProgram.programId
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await Promise.all([
        listingAccounts.refetch(),
        leaseRecordAccounts.refetch()
      ])
    },
    onError: (error) => {
      toast.error(`Failed to lease air rights: ${error.message}`)
    },
  })

  const cancelListingHandler = useMutation<string, Error, CancelListingArgs>({
    mutationKey: ['listing', 'cancel', { cluster }],
    mutationFn: async ({ listingPubkey, ownerPubkey, city, country }) => {
      const [locationIndexPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("location"),
          Buffer.from(city),
          Buffer.from(country)
        ],
        program.programId
      )

      return await program.methods
        .cancelListing()
        .accountsStrict({
          listing: listingPubkey,
          locationIndex: locationIndexPda,
          owner: ownerPubkey
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await Promise.all([
        listingAccounts.refetch(),
        locationIndexAccounts.refetch()
      ])
    },
    onError: (error) => {
      toast.error(`Failed to cancel listing: ${error.message}`)
    },
  })

  return {
    program,
    programId,
    registryAccounts,
    leaseRecordAccounts,
    listingAccounts,
    locationIndexAccounts,
    getProgramAccount,
    initializeRegistryHandler,
    createListingHandler,
    updatePriceHandler,
    purchaseAirRightsHandler,
    leaseAirRightsHandler,
    cancelListingHandler,
  }
}

export function useAirTradeProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, listingAccounts, locationIndexAccounts } = useAirTradeProgram()

  const registryAccountQuery = useQuery({
    queryKey: ['registry', 'fetch', { cluster, account }],
    queryFn: () => program.account.registry.fetch(account),
  })

  const listingAccountQuery = useQuery({
    queryKey: ['listing', 'fetch', { cluster, account }],
    queryFn: () => program.account.listing.fetch(account),
  })

  const locationIndexAccountQuery = useQuery({
    queryKey: ['locationIndex', 'fetch', { cluster, account }],
    queryFn: () => program.account.locationIndex.fetch(account),
  })

  const leaseRecordAccountQuery = useQuery({
    queryKey: ['leaseRecord', 'fetch', { cluster, account }],
    queryFn: () => program.account.leaseRecord.fetch(account),
  })

  const updatePriceMutation = useMutation({
    mutationKey: ['listing', 'updatePrice', { cluster, account }],
    mutationFn: (args: { newPrice: BN; ownerPubkey: PublicKey }) =>
      program.methods
        .updatePrice(args.newPrice)
        .accountsStrict({
          listing: account,
          owner: args.ownerPubkey
        })
        .rpc(),
    onSuccess: async (tx) => {
      transactionToast(tx)
      await listingAccountQuery.refetch()
      await listingAccounts.refetch()
    },
  })

  const cancelListingMutation = useMutation({
    mutationKey: ['listing', 'cancel', { cluster, account }],
    mutationFn: async (args: { ownerPubkey: PublicKey; city: string; country: string }) => {
      const [locationIndexPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("location"),
          Buffer.from(args.city),
          Buffer.from(args.country)
        ],
        program.programId
      )

      return program.methods
        .cancelListing()
        .accountsStrict({
          listing: account,
          locationIndex: locationIndexPda,
          owner: args.ownerPubkey
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await listingAccountQuery.refetch()
      await listingAccounts.refetch()
      await locationIndexAccounts.refetch()
    },
  })

  const purchaseMutation = useMutation({
    mutationKey: ['listing', 'purchase', { cluster, account }],
    mutationFn: (args: {
      buyerPubkey: PublicKey
      sellerPubkey: PublicKey
      platformTreasuryPubkey: PublicKey
    }) => {
      const [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      )

      return program.methods
        .purchaseAirRights()
        .accountsStrict({
          listing: account,
          registry: registryPda,
          buyer: args.buyerPubkey,
          seller: args.sellerPubkey,
          platformTreasury: args.platformTreasuryPubkey,
          systemProgram: SystemProgram.programId
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await listingAccountQuery.refetch()
      await listingAccounts.refetch()
    },
  })

  const leaseMutation = useMutation({
    mutationKey: ['listing', 'lease', { cluster, account }],
    mutationFn: async (args: {
      lesseePubkey: PublicKey
      lessorPubkey: PublicKey
      platformTreasuryPubkey: PublicKey
      listingId: BN
    }) => {
      const [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("registry")],
        program.programId
      )

      const [leaseRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("lease"),
          args.listingId.toArrayLike(Buffer, 'le', 8),
          args.lesseePubkey.toBuffer()
        ],
        program.programId
      )

      return program.methods
        .leaseAirRights()
        .accountsStrict({
          listing: account,
          registry: registryPda,
          leaseRecord: leaseRecordPda,
          lessee: args.lesseePubkey,
          lessor: args.lessorPubkey,
          platformTreasury: args.platformTreasuryPubkey,
          systemProgram: SystemProgram.programId
        })
        .rpc()
    },
    onSuccess: async (tx) => {
      transactionToast(tx)
      await listingAccountQuery.refetch()
      await listingAccounts.refetch()
    },
  })

  return {
    registryAccountQuery,
    listingAccountQuery,
    locationIndexAccountQuery,
    leaseRecordAccountQuery,
    updatePriceMutation,
    cancelListingMutation,
    purchaseMutation,
    leaseMutation,
  }
}

// Helper hook for querying listings by location
export function useListingsByLocation({ city, country }: { city: string; country: string }) {
  const { cluster } = useCluster()
  const { program } = useAirTradeProgram()

  const locationIndexPda = useMemo(() => {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("location"),
        Buffer.from(city),
        Buffer.from(country)
      ],
      program.programId
    )
    return pda
  }, [city, country, program.programId])

  const locationIndexQuery = useQuery({
    queryKey: ['locationIndex', 'fetch', { cluster, city, country }],
    queryFn: () => program.account.locationIndex.fetch(locationIndexPda),
    enabled: !!city && !!country,
  })

  const listingsQuery = useQuery({
    queryKey: ['listing', 'byLocation', { cluster, city, country }],
    queryFn: async () => {
      const allListings = await program.account.listing.all()
      return allListings.filter(
        l => l.account.location.city === city && l.account.location.country === country
      )
    },
    enabled: !!city && !!country,
  })

  return {
    locationIndexPda,
    locationIndex: locationIndexQuery.data,
    listings: listingsQuery.data,
    isLoading: locationIndexQuery.isLoading || listingsQuery.isLoading,
    refetch: async () => {
      await Promise.all([locationIndexQuery.refetch(), listingsQuery.refetch()])
    }
  }
}

// Helper hook for getting registry PDA
export function useRegistryPda() {
  const { program } = useAirTradeProgram()
  
  return useMemo(() => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registry")],
      program.programId
    )
    return pda
  }, [program.programId])
}

// Helper to convert coordinates to on-chain format
export function coordinatesToOnChain(lat: number, lng: number) {
  return {
    latitude: Math.round(lat * 1_000_000),
    longitude: Math.round(lng * 1_000_000)
  }
}

// Helper to convert on-chain coordinates to decimal
export function coordinatesFromOnChain(lat: number, lng: number) {
  return {
    latitude: lat / 1_000_000,
    longitude: lng / 1_000_000
  }
}