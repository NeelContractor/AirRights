"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useAirTradeProgram, useListingsByLocation, coordinatesToOnChain, coordinatesFromOnChain } from "./air-data-access"
import { WalletButton } from "../solana/solana-provider"
import { useState, useMemo } from "react"
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import BN from "bn.js"
import { GLOBAL } from "@/utils/global"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

const ADMIN_PUBKEY = new PublicKey("FAbPnoAVhTmpxk71RzoC7L31nJa62qPq14rZTAE7Z3cw");

export interface RegistryStruct {
  authority: PublicKey,
  totalListings: BN,
  platformFeeBps: number, // Basis points (100 = 1%)
}

export interface ListingStruct {
  owner: PublicKey,
  listingId: BN,
  location: LocationStruct,
  heightFrom: number,
  heightTo: number,
  areaSqm: number,
  price: BN,
  listingType: { sale: Record<string, never> } | { lease: Record<string, never> },
  status: ListingStatus,
  durationDays: number,
  createdAt: BN,
  buyer: PublicKey | null,
}

export interface LocationStruct {
  latitude: number,      // latitude * 1_000_000
  longitude: number,     // longitude * 1_000_000
  gridX: number,        // For efficient spatial search (auto-calculated)
  gridY: number,        // For efficient spatial search (auto-calculated)
  city: string,       // "New York", "Mumbai", "Tokyo"
  country: string,    // ISO country code: "US", "IN", "JP"
}

export interface LocationIndexStruct {
  city: string,
  country: string,
  listingCount: number,
}

export interface LeaseRecordStruct {
  listingId: BN,
  lessor: PublicKey,
  lessee: PublicKey,
  startDate: BN,
  endDate: BN,
  amountPaid: BN,
  isActive: boolean,
}

export type ListingType = 
  { sale: Record<string, never> } |
  { lease: Record<string, never> };

export type ListingStatus =
  { active: Record<string, never> } |
  { sold: Record<string, never> } |
  { leased: Record<string, never> } |
  { cancelled: Record<string, never> };


export default function AirTrade() {
  const { publicKey } = useWallet()
  const {
    registryAccounts,
    leaseRecordAccounts,
    listingAccounts,
    initializeRegistryHandler,
    createListingHandler,
    updatePriceHandler,
    purchaseAirRightsHandler,
    leaseAirRightsHandler,
    cancelListingHandler,
  } = useAirTradeProgram()

  // const registryPda = useRegistryPda()

  // Search state - Start with empty to show all
  const [searchCity, setSearchCity] = useState("")
  const [searchCountry, setSearchCountry] = useState("")
  const [showAllListings, setShowAllListings] = useState(true)
  const [activeTab, setActiveTab] = useState<"browse" | "create" | "my-listings" | "my-rights">("browse")
  const [countryCode, setCountryCode] = useState<string>("")
  const [city, setCity] = useState<string>("")
  const [createCountryCode, setCreateCountryCode] = useState<string>("IN")
  const [createCity, setCreateCity] = useState<string>("Mumbai")
  
  // Update price state - track which listing is being updated
  const [updatingListingId, setUpdatingListingId] = useState<string | null>(null)
  const [updatedPrices, setUpdatedPrices] = useState<{[key: string]: string}>({})

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
  })

  const { listings: filteredListings, locationIndex, isLoading: locationLoading } = useListingsByLocation({
    city: searchCity,
    country: searchCountry,
  })

  // Determine which listings to show
  const displayListings = useMemo(() => {
    if (showAllListings) {
      // Make sure we're accessing the array correctly
      const allListings = listingAccounts.data || []
      // console.log('All listings data:', allListings)
      // console.log('Number of listings:', allListings.length)
      return allListings
    }
    const filtered = filteredListings || []
    // console.log('Filtered listings:', filtered)
    return filtered
  }, [showAllListings, listingAccounts.data, filteredListings])

  const myListings = useMemo(() => {
    if (!publicKey || !listingAccounts.data) return []
    return listingAccounts.data.filter((l) => l.account.owner.equals(publicKey))
  }, [listingAccounts.data, publicKey])

  const myPurchasedRights = useMemo(() => {
    if (!publicKey || !listingAccounts.data) return []
    return listingAccounts.data.filter((l) => {
      const statusKey = Object.keys(l.account.status)[0]
      return statusKey === "sold" && l.account.buyer && l.account.buyer.equals(publicKey)
    })
  }, [listingAccounts.data, publicKey])

  const myLeasedRights = useMemo(() => {
    if (!publicKey || !leaseRecordAccounts.data) return []
    return leaseRecordAccounts.data.filter((l) => l.account.lessee.equals(publicKey))
  }, [leaseRecordAccounts.data, publicKey])

  const handleInitializeRegistry = async () => {
    if (!publicKey) return
    await initializeRegistryHandler.mutateAsync({ payerPubkey: publicKey })
  }

  const handleCreateListing = async () => {
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
    })

    // Reset form and go to browse
    setActiveTab("browse")
    setShowAllListings(true)
  }

  const handleUpdatePrice = async (listing: { account: ListingStruct, publicKey: PublicKey }) => {
    if (!publicKey) return
    
    const listingId = listing.publicKey.toString()
    const newPriceSOL = updatedPrices[listingId]
    
    if (!newPriceSOL || parseFloat(newPriceSOL) <= 0) {
      alert("Please enter a valid price")
      return
    }

    const newPriceLamports = new BN(parseFloat(newPriceSOL) * LAMPORTS_PER_SOL)

    await updatePriceHandler.mutateAsync({
      listingPubkey: listing.publicKey,
      ownerPubkey: publicKey,
      newPrice: newPriceLamports,
    })

    // Clear the update state
    setUpdatingListingId(null)
    setUpdatedPrices(prev => {
      const newPrices = {...prev}
      delete newPrices[listingId]
      return newPrices
    })
  }

  const handlePurchase = async (listing: { account: ListingStruct, publicKey: PublicKey }) => {
    if (!publicKey) return

    await purchaseAirRightsHandler.mutateAsync({
      listingPubkey: listing.publicKey,
      buyerPubkey: publicKey,
      sellerPubkey: listing.account.owner,
      platformTreasuryPubkey: ADMIN_PUBKEY,
    })
  }

  const handleLease = async (listing: { account: ListingStruct, publicKey: PublicKey }) => {
    if (!publicKey) return

    await leaseAirRightsHandler.mutateAsync({
      listingPubkey: listing.publicKey,
      lesseePubkey: publicKey,
      lessorPubkey: listing.account.owner,
      platformTreasuryPubkey: ADMIN_PUBKEY,
      listingId: listing.account.listingId,
    })
  }

  const handleCancel = async (listing: { account: ListingStruct, publicKey: PublicKey }) => {
    if (!publicKey) return

    await cancelListingHandler.mutateAsync({
      listingPubkey: listing.publicKey,
      ownerPubkey: publicKey,
      city: listing.account.location.city,
      country: listing.account.location.country,
    })
  }

  const countries = useMemo(
    () =>
      Object.entries(GLOBAL).map(([code, data]) => ({
        code,
        name: data.country,
      })),
    []
  )

  const cities = countryCode ? GLOBAL[countryCode]?.cities ?? [] : []
  const createCities = createCountryCode ? GLOBAL[createCountryCode]?.cities ?? [] : []

  const getStatusBadge = (status: ListingStatus) => {
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

  const getTypeBadge = (type: ListingType) => {
    const typeKey = Object.keys(type)[0]
    return (
      <span className={`px-2 py-1 rounded text-xs ${typeKey === "sale" ? "bg-orange-100 text-orange-800" : "bg-indigo-100 text-indigo-800"}`}>
        {typeKey === "sale" ? "FOR SALE" : "FOR LEASE"}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-mono text-black">
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
            <Button
              onClick={handleInitializeRegistry}
              disabled={!publicKey || initializeRegistryHandler.isPending}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {initializeRegistryHandler.isPending ? "Initializing..." : "Initialize Registry"}
            </Button>
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
            <button
              onClick={() => setActiveTab("my-rights")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "my-rights"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              My Rights ({myPurchasedRights.length + myLeasedRights.length})
            </button>
          </nav>
        </div>

        {/* Browse Tab */}
        {activeTab === "browse" && (
          <div>
            {/* Search */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Search by Location</h2>
                <Button
                  onClick={() => {
                    setShowAllListings(!showAllListings)
                    if (!showAllListings) {
                      // Switching to show all
                      setCountryCode("")
                      setCity("")
                      setSearchCity("")
                      setSearchCountry("")
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    showAllListings
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {showAllListings ? "📋 Showing All Listings" : "🔍 Show All Listings"}
                </Button>
              </div>
              
              {!showAllListings && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    value={countryCode}
                    onValueChange={(value) => {
                      setCountryCode(value)
                      setSearchCountry(value)
                      setCity("")
                      setSearchCity("")
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(({ code, name }) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={city}
                    onValueChange={(value) => {
                      setCity(value)
                      setSearchCity(value)
                    }}
                    disabled={!countryCode}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((cityName) => (
                        <SelectItem key={cityName} value={cityName}>
                          {cityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center">
                    {locationIndex && searchCity && searchCountry && (
                      <span className="text-gray-600">
                        📊 {locationIndex.listingCount} listing{locationIndex.listingCount !== 1 ? "s" : ""} found
                      </span>
                    )}
                  </div>
                </div>
              )}

              {showAllListings && (
                <div className="text-center py-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-700 font-medium">
                    📊 Displaying all {displayListings.length} listing{displayListings.length !== 1 ? "s" : ""} from all locations
                  </p>
                </div>
              )}
            </div>

            {/* Listings Grid */}
            {(showAllListings ? listingAccounts.isLoading : locationLoading) ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading listings...</p>
              </div>
            ) : displayListings && displayListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayListings.map((listing) => {
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
                              <Button
                                onClick={() => handlePurchase(listing)}
                                disabled={purchaseAirRightsHandler.isPending}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                Purchase
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleLease(listing)}
                                disabled={leaseAirRightsHandler.isPending}
                                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                              >
                                Lease
                              </Button>
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
                <p className="text-gray-500 text-lg">
                  {showAllListings 
                    ? "No listings available yet" 
                    : `No listings found in ${searchCity}, ${searchCountry}`}
                </p>
                <p className="text-gray-400 mt-2">
                  {showAllListings 
                    ? "Be the first to create a listing!" 
                    : "Try a different location or show all listings"}
                </p>
                {!showAllListings && (
                  <Button
                    onClick={() => setShowAllListings(true)}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  >
                    Show All Listings
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create Tab */}
        {activeTab === "create" && (
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6">Create New Listing</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Country</Label>
                  <Select
                    value={createCountryCode}
                    onValueChange={(value) => {
                      setCreateCountryCode(value)
                      setFormData({ ...formData, country: value, city: "" })
                      setCreateCity("")
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(({ code, name }) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">City</Label>
                  <Select
                    value={createCity}
                    onValueChange={(value) => {
                      setCreateCity(value)
                      setFormData({ ...formData, city: value })
                    }}
                    disabled={!createCountryCode}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {createCities.map((cityName) => (
                        <SelectItem key={cityName} value={cityName}>
                          {cityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Longitude</Label>
                  <Input
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
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Height From (m)</Label>
                  <Input
                    type="number"
                    value={formData.heightFrom}
                    onChange={(e) => setFormData({ ...formData, heightFrom: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Height To (m)</Label>
                  <Input
                    type="number"
                    value={formData.heightTo}
                    onChange={(e) => setFormData({ ...formData, heightTo: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Area (m²)</Label>
                <Input
                  type="number"
                  value={formData.areaSqm}
                  onChange={(e) => setFormData({ ...formData, areaSqm: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                  required
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Price (SOL)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full border border-gray-300 rounded px-4 py-2"
                  required
                />
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Listing Type</Label>
                <Select
                  value={formData.listingType}
                  onValueChange={(value) => setFormData({ ...formData, listingType: value as "sale" | "lease" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select listing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.listingType === "lease" && (
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</Label>
                  <Input
                    type="number"
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded px-4 py-2"
                    required
                  />
                </div>
              )}

              <Button
                onClick={handleCreateListing}
                disabled={!publicKey || createListingHandler.isPending}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
              >
                {createListingHandler.isPending ? "Creating..." : "Create Listing"}
              </Button>
            </div>
          </div>
        )}

        {/* My Listings Tab */}
        {activeTab === "my-listings" && (
          <div>
            {myListings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">You don&apos;t have any listings yet</p>
                <Button
                  onClick={() => setActiveTab("create")}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                >
                  Create Your First Listing
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myListings.map((listing) => {
                  const coords = coordinatesFromOnChain(
                    listing.account.location.latitude,
                    listing.account.location.longitude
                  )
                  const isActive = Object.keys(listing.account.status)[0] === "active"
                  const listingId = listing.publicKey.toString()
                  const isUpdating = updatingListingId === listingId

                  return (
                    <div key={listingId} className="bg-white rounded-lg shadow p-6">
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

                      <div className="border-t pt-4 space-y-3">
                        <p className="text-2xl font-bold text-blue-600">
                          {(listing.account.price.toNumber() / LAMPORTS_PER_SOL).toFixed(2)} SOL
                        </p>

                        {isActive && (
                          <div className="space-y-2">
                            {isUpdating ? (
                              <div className="space-y-2">
                                <Label htmlFor={`price-${listingId}`}>New Price (SOL)</Label>
                                <Input 
                                  id={`price-${listingId}`}
                                  type="number"
                                  step="0.01"
                                  placeholder="Enter new price"
                                  value={updatedPrices[listingId] || ""}
                                  onChange={(e) => {
                                    setUpdatedPrices(prev => ({
                                      ...prev,
                                      [listingId]: e.target.value
                                    }))
                                  }}
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    className="flex-1"
                                    onClick={() => handleUpdatePrice(listing)}
                                    disabled={updatePriceHandler.isPending}
                                  >
                                    {updatePriceHandler.isPending ? "Updating..." : "Confirm"}
                                  </Button>
                                  <Button 
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                      setUpdatingListingId(null)
                                      setUpdatedPrices(prev => {
                                        const newPrices = {...prev}
                                        delete newPrices[listingId]
                                        return newPrices
                                      })
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button 
                                className="w-full"
                                variant="outline"
                                onClick={() => setUpdatingListingId(listingId)}
                              >
                                Update Price
                              </Button>
                            )}
                          </div>
                        )}

                        {isActive && !isUpdating && (
                          <Button
                            onClick={() => handleCancel(listing)}
                            disabled={cancelListingHandler.isPending}
                            className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {cancelListingHandler.isPending ? "Cancelling..." : "Cancel Listing"}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* My Rights Tab */}
        {activeTab === "my-rights" && (
          <div className="space-y-8">
            {/* Purchased Air Rights Section */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <span>🏢</span> Purchased Air Rights
              </h2>
              {myPurchasedRights.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <p className="text-gray-500 text-lg">You haven&apos;t purchased any air rights yet</p>
                  <Button
                    onClick={() => setActiveTab("browse")}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  >
                    Browse Available Rights
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myPurchasedRights.map((listing) => {
                    const coords = coordinatesFromOnChain(
                      listing.account.location.latitude,
                      listing.account.location.longitude
                    )
                    const purchaseDate = new Date(listing.account.createdAt.toNumber() * 1000)

                    return (
                      <div key={listing.publicKey.toString()} className="bg-white rounded-lg shadow p-6 border-2 border-blue-200">
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-800 font-semibold">
                            OWNED
                          </span>
                          <span className="text-xs text-gray-500">
                            {purchaseDate.toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="font-semibold text-lg mb-2">
                          {listing.account.location.city}, {listing.account.location.country}
                        </h3>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p>📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</p>
                          <p>📏 Height: {listing.account.heightFrom}m - {listing.account.heightTo}m</p>
                          <p>📐 Area: {listing.account.areaSqm} m²</p>
                          <p>💰 Purchased for: {(listing.account.price.toNumber() / LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                        </div>

                        <div className="border-t pt-4">
                          <div className="bg-blue-50 p-3 rounded">
                            <p className="text-xs text-blue-800 font-medium">
                              You own the permanent rights to this airspace
                            </p>
                          </div>
                          {/* {listing.account.metadataUri && listing.account.metadataUri !== "https://arweave.net/example" && (
                            <a
                              href={listing.account.metadataUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 text-xs text-blue-600 hover:text-blue-800 block"
                            >
                              View Metadata →
                            </a>
                          )} */}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Leased Air Rights Section */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <span>📅</span> Leased Air Rights
              </h2>
              {myLeasedRights.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <p className="text-gray-500 text-lg">You haven&apos;t leased any air rights yet</p>
                  <Button
                    onClick={() => setActiveTab("browse")}
                    className="mt-4 bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
                  >
                    Browse Available Leases
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myLeasedRights.map((leaseRecord) => {
                    // Find the corresponding listing
                    const listing = listingAccounts.data?.find(
                      (l) => l.account.listingId.eq(leaseRecord.account.listingId)
                    )

                    if (!listing) return null

                    const coords = coordinatesFromOnChain(
                      listing.account.location.latitude,
                      listing.account.location.longitude
                    )

                    const startDate = new Date(leaseRecord.account.startDate.toNumber() * 1000)
                    const endDate = new Date(leaseRecord.account.endDate.toNumber() * 1000)
                    const now = new Date()
                    const isActive = leaseRecord.account.isActive && now < endDate
                    const daysRemaining = isActive 
                      ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                      : 0

                    return (
                      <div 
                        key={leaseRecord.publicKey.toString()} 
                        className={`bg-white rounded-lg shadow p-6 border-2 ${
                          isActive ? 'border-purple-200' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className={`px-3 py-1 rounded text-sm font-semibold ${
                            isActive 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isActive ? 'ACTIVE LEASE' : 'EXPIRED'}
                          </span>
                          {isActive && daysRemaining <= 30 && (
                            <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                              {daysRemaining} days left
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-lg mb-2">
                          {listing.account.location.city}, {listing.account.location.country}
                        </h3>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <p>📍 {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</p>
                          <p>📏 Height: {listing.account.heightFrom}m - {listing.account.heightTo}m</p>
                          <p>📐 Area: {listing.account.areaSqm} m²</p>
                          <p>💰 Paid: {(leaseRecord.account.amountPaid.toNumber() / LAMPORTS_PER_SOL).toFixed(2)} SOL</p>
                        </div>

                        <div className="border-t pt-4 space-y-2">
                          <div className={`p-3 rounded ${isActive ? 'bg-purple-50' : 'bg-gray-50'}`}>
                            <p className="text-xs font-medium mb-1">
                              <span className="text-gray-600">Start:</span> {startDate.toLocaleDateString()}
                            </p>
                            <p className="text-xs font-medium">
                              <span className="text-gray-600">End:</span> {endDate.toLocaleDateString()}
                            </p>
                          </div>

                          {isActive && (
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-xs text-green-800 font-medium text-center">
                                ✓ Lease is active
                              </p>
                            </div>
                          )}

                          {!isActive && (
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="text-xs text-gray-600 text-center">
                                This lease has expired
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Summary Stats */}
            {(myPurchasedRights.length > 0 || myLeasedRights.length > 0) && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Portfolio Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Owned Rights</p>
                    <p className="text-2xl font-bold text-blue-600">{myPurchasedRights.length}</p>
                  </div>
                  <div className="bg-white rounded p-4">
                    <p className="text-sm text-gray-600 mb-1">Active Leases</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {myLeasedRights.filter(lr => {
                        const endDate = new Date(lr.account.endDate.toNumber() * 1000)
                        return lr.account.isActive && new Date() < endDate
                      }).length}
                    </p>
                  </div>
                  <div className="bg-white rounded p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Investment</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(
                        [...myPurchasedRights, ...myLeasedRights].reduce((sum, item) => {
                          const price = 'price' in item.account 
                            ? item.account.price.toNumber() 
                            : item.account.amountPaid.toNumber()
                          return sum + price
                        }, 0) / LAMPORTS_PER_SOL
                      ).toFixed(2)} SOL
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}