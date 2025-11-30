"use client"

import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useAirTradeProgram, useListingsByLocation, useRegistryPda, coordinatesToOnChain, coordinatesFromOnChain } from "./air-data-access"
import { WalletButton } from "../solana/solana-provider"
import { useState, useMemo } from "react"
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import BN from "bn.js"

const ADMIN_PUBKEY = new PublicKey("FAbPnoAVhTmpxk71RzoC7L31nJa62qPq14rZTAE7Z3cw");

export default function AirTrade() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const {
    program,
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
  } = useAirTradeProgram()

  const registryPda = useRegistryPda()

  // Search state
  const [searchCity, setSearchCity] = useState("Mumbai")
  const [searchCountry, setSearchCountry] = useState("IN")
  const [activeTab, setActiveTab] = useState<"browse" | "create" | "my-listings">("browse")

  // Create listing form state
  const [formData, setFormData] = useState({
    latitude: 19.076,
    longitude: 72.8777,
    heightFrom: 50,
    heightTo: 150,
    areaSqm: 1000,
    price: "5",
    listingType: "sale" as "sale" | "lease",
    durationDays: 365,
    city: "Mumbai",
    country: "IN",
    metadataUri: "https://arweave.net/example",
  })

  // Platform treasury (in production, this should be your actual treasury wallet)
  const platformTreasury = useMemo(
    () => new PublicKey("11111111111111111111111111111111"),
    []
  )

  const { listings, locationIndex, isLoading: locationLoading } = useListingsByLocation({
    city: searchCity,
    country: searchCountry,
  })

  const myListings = useMemo(() => {
    if (!publicKey || !listingAccounts.data) return []
    return listingAccounts.data.filter((l) => l.account.owner.equals(publicKey))
  }, [listingAccounts.data, publicKey])

  const handleInitializeRegistry = async () => {
    if (!publicKey) return
    await initializeRegistryHandler.mutateAsync({ payerPubkey: publicKey })
  }

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey) return

    const coords = coordinatesToOnChain(formData.latitude, formData.longitude)

    await createListingHandler.mutateAsync({
      ownerPubkey: publicKey,
      latitude: coords.latitude,
      longitude: coords.longitude,
      heightFrom: formData.heightFrom,
      heightTo: formData.heightTo,
      areaSqm: formData.areaSqm,
      price: new BN(parseFloat(formData.price) * LAMPORTS_PER_SOL),
      listingType: formData.listingType,
      durationDays: formData.durationDays,
      city: formData.city,
      country: formData.country,
      metadataUri: formData.metadataUri,
    })

    // Reset form
    setActiveTab("browse")
  }

  const handlePurchase = async (listing: any) => {
    if (!publicKey) return

    await purchaseAirRightsHandler.mutateAsync({
      listingPubkey: listing.publicKey,
      buyerPubkey: publicKey,
      sellerPubkey: listing.account.owner,
      platformTreasuryPubkey: platformTreasury,
    })
  }

  const handleLease = async (listing: any) => {
    if (!publicKey) return

    await leaseAirRightsHandler.mutateAsync({
      listingPubkey: listing.publicKey,
      lesseePubkey: publicKey,
      lessorPubkey: listing.account.owner,
      platformTreasuryPubkey: platformTreasury,
      listingId: listing.account.listingId,
    })
  }

  const handleCancel = async (listing: any) => {
    if (!publicKey) return

    await cancelListingHandler.mutateAsync({
      listingPubkey: listing.publicKey,
      ownerPubkey: publicKey,
      city: listing.account.location.city,
      country: listing.account.location.country,
    })
  }

  const getStatusBadge = (status: any) => {
    const statusKey = Object.keys(status)[0]
    const colors = {
      active: "bg-green-100 text-green-800",
      sold: "bg-blue-100 text-blue-800",
      leased: "bg-purple-100 text-purple-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[statusKey as keyof typeof colors]}`}>
        {statusKey.toUpperCase()}
      </span>
    )
  }

  const getTypeBadge = (type: any) => {
    const typeKey = Object.keys(type)[0]
    return (
      <span className={`px-2 py-1 rounded text-xs ${typeKey === "sale" ? "bg-orange-100 text-orange-800" : "bg-indigo-100 text-indigo-800"}`}>
        {typeKey === "sale" ? "FOR SALE" : "FOR LEASE"}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-mono">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Air Rights Trading</h1>
              <p className="text-gray-600 mt-1">Monetize and trade airspace rights on Solana</p>
            </div>
            <WalletButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Registry Status */}
        {registryAccounts.isLoading ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">Loading registry...</p>
          </div>
        ) : registryAccounts.data && registryAccounts.data.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 mb-2">Registry not initialized</p>
            <button
              onClick={handleInitializeRegistry}
              disabled={!publicKey || initializeRegistryHandler.isPending}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {initializeRegistryHandler.isPending ? "Initializing..." : "Initialize Registry"}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">
              ✅ Registry Active - Total Listings: {registryAccounts.data?.[0]?.account.totalListings.toString() || "0"}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("browse")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "browse"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Browse Listings
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "create"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Create Listing
            </button>
            <button
              onClick={() => setActiveTab("my-listings")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "my-listings"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Listings ({myListings.length})
            </button>
          </nav>
        </div>

        {/* Browse Tab */}
        {activeTab === "browse" && (
          <div>
            {/* Search */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Search by Location</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="City (e.g., Mumbai)"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="border border-gray-300 rounded px-4 py-2"
                />
                <input
                  type="text"
                  placeholder="Country Code (e.g., IN)"
                  value={searchCountry}
                  onChange={(e) => setSearchCountry(e.target.value.toUpperCase())}
                  className="border border-gray-300 rounded px-4 py-2"
                  maxLength={3}
                />
                <div className="flex items-center">
                  {locationIndex && (
                    <span className="text-gray-600">
                      📊 {locationIndex.listingCount} listing{locationIndex.listingCount !== 1 ? "s" : ""} found
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Listings Grid */}
            {locationLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading listings...</p>
              </div>
            ) : listings && listings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => {
                  const coords = coordinatesFromOnChain(
                    listing.account.location.latitude,
                    listing.account.location.longitude
                  )
                  const isActive = Object.keys(listing.account.status)[0] === "active"
                  const isOwner = publicKey?.equals(listing.account.owner)

                  return (
                    <div key={listing.publicKey.toString()} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                      <div className="flex justify-between items-start mb-4">
                        {getTypeBadge(listing.account.listingType)}
                        {getStatusBadge(listing.account.status)}
                      </div>

                      <h3 className="font-semibold text-lg mb-2">
                        {listing.account.location.city}, {listing.account.location.country}
                      </h3>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <p>📍 Lat: {coords.latitude.toFixed(4)}, Lng: {coords.longitude.toFixed(4)}</p>
                        <p>📏 Height: {listing.account.heightFrom}m - {listing.account.heightTo}m</p>
                        <p>📐 Area: {listing.account.areaSqm} m²</p>
                        {listing.account.durationDays > 0 && (
                          <p>⏱️ Duration: {listing.account.durationDays} days</p>
                        )}
                      </div>

                      <div className="border-t pt-4">
                        <p className="text-2xl font-bold text-blue-600 mb-4">
                          {(listing.account.price.toNumber() / LAMPORTS_PER_SOL).toFixed(2)} SOL
                        </p>

                        {!publicKey ? (
                          <p className="text-sm text-gray-500">Connect wallet to trade</p>
                        ) : isOwner ? (
                          <p className="text-sm text-gray-500">Your listing</p>
                        ) : isActive ? (
                          <div className="flex gap-2">
                            {Object.keys(listing.account.listingType)[0] === "sale" ? (
                              <button
                                onClick={() => handlePurchase(listing)}
                                disabled={purchaseAirRightsHandler.isPending}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                Purchase
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLease(listing)}
                                disabled={leaseAirRightsHandler.isPending}
                                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                              >
                                Lease
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Not available</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">No listings found in {searchCity}, {searchCountry}</p>
                <p className="text-gray-400 mt-2">Try a different location or create your own listing</p>
              </div>
            )}
          </div>
        )}

        {/* Create Tab */}
        {activeTab === "create" && (
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6">Create New Listing</h2>
            <form onSubmit={handleCreateListing} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    maxLength={3}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height From (m)</label>
                  <input
                    type="number"
                    value={formData.heightFrom}
                    onChange={(e) => setFormData({ ...formData, heightFrom: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height To (m)</label>
                  <input
                    type="number"
                    value={formData.heightTo}
                    onChange={(e) => setFormData({ ...formData, heightTo: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (m²)</label>
                <input
                  type="number"
                  value={formData.areaSqm}
                  onChange={(e) => setFormData({ ...formData, areaSqm: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (SOL)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type</label>
                <select
                  value={formData.listingType}
                  onChange={(e) => setFormData({ ...formData, listingType: e.target.value as "sale" | "lease" })}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                >
                  <option value="sale">Sale</option>
                  <option value="lease">Lease</option>
                </select>
              </div>

              {formData.listingType === "lease" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metadata URI</label>
                <input
                  type="text"
                  value={formData.metadataUri}
                  onChange={(e) => setFormData({ ...formData, metadataUri: e.target.value })}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                  placeholder="https://arweave.net/..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!publicKey || createListingHandler.isPending}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
              >
                {createListingHandler.isPending ? "Creating..." : "Create Listing"}
              </button>
            </form>
          </div>
        )}

        {/* My Listings Tab */}
        {activeTab === "my-listings" && (
          <div>
            {myListings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">You don't have any listings yet</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                >
                  Create Your First Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myListings.map((listing) => {
                  const coords = coordinatesFromOnChain(
                    listing.account.location.latitude,
                    listing.account.location.longitude
                  )
                  const isActive = Object.keys(listing.account.status)[0] === "active"

                  return (
                    <div key={listing.publicKey.toString()} className="bg-white rounded-lg shadow p-6">
                      <div className="flex justify-between items-start mb-4">
                        {getTypeBadge(listing.account.listingType)}
                        {getStatusBadge(listing.account.status)}
                      </div>

                      <h3 className="font-semibold text-lg mb-2">
                        {listing.account.location.city}, {listing.account.location.country}
                      </h3>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <p>📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</p>
                        <p>📏 {listing.account.heightFrom}m - {listing.account.heightTo}m</p>
                        <p>📐 {listing.account.areaSqm} m²</p>
                      </div>

                      <div className="border-t pt-4">
                        <p className="text-2xl font-bold text-blue-600 mb-4">
                          {(listing.account.price.toNumber() / LAMPORTS_PER_SOL).toFixed(2)} SOL
                        </p>

                        {isActive && (
                          <button
                            onClick={() => handleCancel(listing)}
                            disabled={cancelListingHandler.isPending}
                            className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {cancelListingHandler.isPending ? "Cancelling..." : "Cancel Listing"}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}