import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Air } from '../target/types/air'

describe('Air Rights Trading', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Air as Program<Air>

  // Test data
  const city = "Mumbai"
  const country = "IN"
  const latitude = 19076090 // 19.076090 * 1_000_000
  const longitude = 72877426 // 72.877426 * 1_000_000
  const heightFrom = 50
  const heightTo = 150
  const areaSqm = 1000
  const price = new BN(5 * LAMPORTS_PER_SOL)
  const durationDays = 365
  const metadataUri = "https://arweave.net/abc123"

  let registryPda: PublicKey
  let listingPda: PublicKey
  let locationIndexPda: PublicKey
  let platformTreasury: Keypair
  let buyer: Keypair
  let lessee: Keypair

  beforeAll(async () => {
    // Generate keypairs for testing
    platformTreasury = Keypair.generate()
    buyer = Keypair.generate()
    lessee = Keypair.generate()

    // Airdrop SOL to test accounts
    const airdropSig1 = await provider.connection.requestAirdrop(
      buyer.publicKey,
      10 * LAMPORTS_PER_SOL
    )
    await provider.connection.confirmTransaction(airdropSig1)

    const airdropSig2 = await provider.connection.requestAirdrop(
      lessee.publicKey,
      10 * LAMPORTS_PER_SOL
    )
    await provider.connection.confirmTransaction(airdropSig2)
  })

  it('Initialize Registry', async () => {
    [registryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registry")],
      program.programId
    )

    await program.methods
      .initializeRegistry()
      .accountsStrict({
        authority: payer.publicKey,
        registry: registryPda,
        systemProgram: SystemProgram.programId
      })
      .rpc()

    const registryAcc = await program.account.registry.fetch(registryPda)

    expect(registryAcc.authority.toString()).toEqual(payer.publicKey.toString())
    expect(registryAcc.totalListings.toNumber()).toEqual(0)
    expect(registryAcc.platformFeeBps).toEqual(250) // 2.5%
    
    console.log("Registry initialized successfully")
  })

  it('Create Listing for Sale', async () => {
    const registry = await program.account.registry.fetch(registryPda);
    
    [listingPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        registry.totalListings.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    [locationIndexPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("location"),
        Buffer.from(city),
        Buffer.from(country)
      ],
      program.programId
    )

    await program.methods
      .createListing(
        latitude,
        longitude,
        heightFrom,
        heightTo,
        areaSqm,
        price,
        { sale: {} }, // ListingType::Sale
        durationDays,
        city,
        country,
        metadataUri
      )
      .accountsStrict({
        listing: listingPda,
        registry: registryPda,
        locationIndex: locationIndexPda,
        owner: payer.publicKey,
        systemProgram: SystemProgram.programId
      })
      .rpc()

    const listing = await program.account.listing.fetch(listingPda)
    
    expect(listing.owner.toString()).toEqual(payer.publicKey.toString())
    expect(listing.listingId.toNumber()).toEqual(0)
    expect(listing.location.latitude).toEqual(latitude)
    expect(listing.location.longitude).toEqual(longitude)
    expect(listing.location.city).toEqual(city)
    expect(listing.location.country).toEqual(country)
    expect(listing.heightFrom).toEqual(heightFrom)
    expect(listing.heightTo).toEqual(heightTo)
    expect(listing.areaSqm).toEqual(areaSqm)
    expect(listing.price.toString()).toEqual(price.toString())
    expect(listing.status).toEqual({ active: {} }) // TODO
    expect(listing.listingType).toEqual({ sale: {} }) // TODO
    expect(listing.metadataUri).toEqual(metadataUri)

    // Check location index
    const locationIndex = await program.account.locationIndex.fetch(locationIndexPda)
    expect(locationIndex.city).toEqual(city)
    expect(locationIndex.country).toEqual(country)
    expect(locationIndex.listingCount).toEqual(1)

    // Check registry updated
    const updatedRegistry = await program.account.registry.fetch(registryPda)
    expect(updatedRegistry.totalListings.toNumber()).toEqual(1)
    
    console.log("Listing created successfully")
    console.log(`   Listing ID: ${listing.listingId.toString()}`)
    console.log(`   Location: ${city}, ${country}`)
    console.log(`   Price: ${price.toNumber() / LAMPORTS_PER_SOL} SOL`)
  })

  it('Update Listing Price', async () => {
    const newPrice = new BN(7 * LAMPORTS_PER_SOL)

    await program.methods
      .updatePrice(newPrice)
      .accountsStrict({
        listing: listingPda,
        owner: payer.publicKey
      })
      .rpc()

    const listing = await program.account.listing.fetch(listingPda)
    expect(listing.price.toString()).toEqual(newPrice.toString())
    
    console.log("Price updated successfully")
    console.log(`   New price: ${newPrice.toNumber() / LAMPORTS_PER_SOL} SOL`)
  })

  it('Purchase Air Rights', async () => {
    const listing = await program.account.listing.fetch(listingPda)
    const sellerBalanceBefore = await provider.connection.getBalance(payer.publicKey)
    const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey)

    await program.methods
      .purchaseAirRights()
      .accountsStrict({
        listing: listingPda,
        registry: registryPda,
        buyer: buyer.publicKey,
        seller: payer.publicKey,
        platformTreasury: platformTreasury.publicKey,
        systemProgram: SystemProgram.programId
      })
      .signers([buyer])
      .rpc()

    const updatedListing = await program.account.listing.fetch(listingPda);
    expect(updatedListing.status).toEqual({ sold: {} }); // TODO
    expect(updatedListing?.buyer?.toString()).toEqual(buyer.publicKey.toString());

    // Verify payment distribution
    const sellerBalanceAfter = await provider.connection.getBalance(payer.publicKey)
    const platformFee = listing.price.muln(250).divn(10000) // 2.5% fee
    const sellerAmount = listing.price.sub(platformFee)

    expect(sellerBalanceAfter).toBeGreaterThan(sellerBalanceBefore)
    
    console.log("Air rights purchased successfully")
    console.log(`   Buyer: ${buyer.publicKey.toString().slice(0, 8)}...`)
    console.log(`   Platform fee: ${platformFee.toNumber() / LAMPORTS_PER_SOL} SOL`)
  })

  it('Create Listing for Lease', async () => {
    const registry = await program.account.registry.fetch(registryPda)
    
    const [leaseListing] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        registry.totalListings.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    )

    await program.methods
      .createListing(
        latitude,
        longitude,
        heightFrom,
        heightTo,
        areaSqm,
        new BN(1 * LAMPORTS_PER_SOL), // Lease price
        { lease: {} }, // ListingType::Lease
        durationDays,
        city,
        country,
        metadataUri
      )
      .accountsStrict({
        listing: leaseListing,
        registry: registryPda,
        locationIndex: locationIndexPda,
        owner: payer.publicKey,
        systemProgram: SystemProgram.programId
      })
      .rpc()

    const listing = await program.account.listing.fetch(leaseListing)
    expect(listing.listingType).toEqual({ lease: {} }) // TODO
    expect(listing.durationDays).toEqual(durationDays)

    // Check location index incremented
    const locationIndex = await program.account.locationIndex.fetch(locationIndexPda)
    expect(locationIndex.listingCount).toEqual(2)
    
    console.log("Lease listing created successfully")
    console.log(`   Duration: ${durationDays} days`)

    // Store for lease test
    listingPda = leaseListing
  })

  it('Lease Air Rights', async () => {
    const listing = await program.account.listing.fetch(listingPda)

    const [leaseRecordPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("lease"),
        listing.listingId.toArrayLike(Buffer, 'le', 8),
        lessee.publicKey.toBuffer()
      ],
      program.programId
    )

    await program.methods
      .leaseAirRights()
      .accountsStrict({
        listing: listingPda,
        registry: registryPda,
        leaseRecord: leaseRecordPda,
        lessee: lessee.publicKey,
        lessor: payer.publicKey,
        platformTreasury: platformTreasury.publicKey,
        systemProgram: SystemProgram.programId
      })
      .signers([lessee])
      .rpc()

    const updatedListing = await program.account.listing.fetch(listingPda)
    expect(updatedListing.status).toEqual({ leased: {} }) // TODO
    expect(updatedListing?.buyer?.toString()).toEqual(lessee.publicKey.toString())

    // Check lease record
    const leaseRecord = await program.account.leaseRecord.fetch(leaseRecordPda)
    expect(leaseRecord.lessor.toString()).toEqual(payer.publicKey.toString())
    expect(leaseRecord.lessee.toString()).toEqual(lessee.publicKey.toString())
    expect(leaseRecord.isActive).toBeTruthy
    expect(leaseRecord.amountPaid.toString()).toEqual(listing.price.toString())

    const endDate = leaseRecord.startDate.toNumber() + (durationDays * 86400)
    expect(leaseRecord.endDate.toNumber()).toEqual(endDate)
    
    console.log("Air rights leased successfully")
    console.log(`   Lessee: ${lessee.publicKey.toString().slice(0, 8)}...`)
    console.log(`   Duration: ${durationDays} days`)
    console.log(`   End date: ${new Date(endDate * 1000).toISOString()}`)
  })

  it('Create Another Listing for Cancel Test', async () => {
    const registry = await program.account.registry.fetch(registryPda)
    
    const [cancelListing] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        registry.totalListings.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    )

    await program.methods
      .createListing(
        latitude,
        longitude,
        100,
        200,
        500,
        new BN(3 * LAMPORTS_PER_SOL),
        { sale: {} },
        0,
        city,
        country,
        metadataUri
      )
      .accountsStrict({
        listing: cancelListing,
        registry: registryPda,
        locationIndex: locationIndexPda,
        owner: payer.publicKey,
        systemProgram: SystemProgram.programId
      })
      .rpc()

    listingPda = cancelListing
    console.log("Created listing for cancel test")
  })

  it('Cancel Listing', async () => {
    const locationIndexBefore = await program.account.locationIndex.fetch(locationIndexPda)
    const countBefore = locationIndexBefore.listingCount

    await program.methods
      .cancelListing()
      .accountsStrict({
        listing: listingPda,
        locationIndex: locationIndexPda,
        owner: payer.publicKey
      })
      .rpc()

    const listing = await program.account.listing.fetch(listingPda)
    expect(listing.status).toEqual({ cancelled: {} }) // TODO

    // Check location index decremented
    const locationIndexAfter = await program.account.locationIndex.fetch(locationIndexPda)
    expect(locationIndexAfter.listingCount).toEqual(countBefore - 1)
    
    console.log("Listing cancelled successfully")
  })

  it('Fail to Purchase Cancelled Listing', async () => {
    try {
      await program.methods
        .purchaseAirRights()
        .accountsStrict({
          listing: listingPda,
          registry: registryPda,
          buyer: buyer.publicKey,
          seller: payer.publicKey,
          platformTreasury: platformTreasury.publicKey,
          systemProgram: SystemProgram.programId
        })
        .signers([buyer])
        .rpc()
      
      console.log("Should have failed to purchase cancelled listing");
    } catch (error: any) {
      console.log(error);
      expect(error.error.errorMessage).toContain("Listing is not active")
      console.log("Correctly prevented purchase of cancelled listing")
    }
  })

  it('Test Location Index Query', async () => {
    const locationIndex = await program.account.locationIndex.fetch(locationIndexPda)
    
    console.log("\n📊 Location Index Stats:")
    console.log(`   City: ${locationIndex.city}`)
    console.log(`   Country: ${locationIndex.country}`)
    console.log(`   Active Listings: ${locationIndex.listingCount}`)
    
    expect(locationIndex.city).toEqual(city)
    expect(locationIndex.country).toEqual(country)
    expect(locationIndex.listingCount).toBeGreaterThan(0)
  })

  it('Fetch All Listings for Location', async () => {
    // Get all listing accounts
    const listings = await program.account.listing.all()
    
    // Filter by city and country
    const mumbaiListings = listings.filter(
      l => l.account.location.city === city && 
           l.account.location.country === country
    )

    console.log(`\n  Found ${mumbaiListings.length} listings in ${city}, ${country}`)
    
    mumbaiListings.forEach((listing, idx) => {
      console.log(`\n   Listing ${idx + 1}:`)
      console.log(`   - ID: ${listing.account.listingId.toString()}`)
      console.log(`   - Type: ${Object.keys(listing.account.listingType)[0]}`)
      console.log(`   - Status: ${Object.keys(listing.account.status)[0]}`)
      console.log(`   - Price: ${listing.account.price.toNumber() / LAMPORTS_PER_SOL} SOL`)
      console.log(`   - Height: ${listing.account.heightFrom}m - ${listing.account.heightTo}m`)
    })

    expect(mumbaiListings.length).toBeGreaterThan(0)
  })
})