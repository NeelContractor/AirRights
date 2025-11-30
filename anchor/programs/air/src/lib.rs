#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("3zMwSoPMzhJtE4fsNdZ4qg7NfvEmJzswBRC3TzJbjRR8");

#[program]
pub mod air {
    use super::*;

    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.total_listings = 0;
        registry.platform_fee_bps = 250; // 2.5% fee
        Ok(())
    }

    /// List air rights for sale or lease
    pub fn create_listing(
        ctx: Context<CreateListing>,
        latitude: i32,      // Stored as latitude * 1_000_000 for precision
        longitude: i32,     // Stored as longitude * 1_000_000 for precision
        height_from: u16,   // Height in meters
        height_to: u16,     // Height in meters
        area_sqm: u32,      // Area in square meters
        price: u64,         // Price in lamports or SPL token
        listing_type: ListingType,
        duration_days: u32, // For leases
        city: String,       // City name for easy search
        country: String,    // Country code (e.g., "US", "IN")
        metadata_uri: String,
    ) -> Result<()> {
        require!(metadata_uri.len() <= 200, ErrorCode::MetadataUriTooLong);
        require!(city.len() > 0 && city.len() <= 50, ErrorCode::CityNameTooLong);
        require!(country.len() >= 2 && country.len() <= 3, ErrorCode::CountryCodeInvalid);
        require!(height_to > height_from, ErrorCode::InvalidHeightRange);
        require!(price > 0, ErrorCode::InvalidPrice);

        let listing = &mut ctx.accounts.listing;
        let registry = &mut ctx.accounts.registry;

        // Calculate grid coordinates for spatial indexing (0.01 degree precision)
        let grid_x = ((longitude + 180_000_000) / 10_000) as u32;
        let grid_y = ((latitude + 90_000_000) / 10_000) as u32;

        listing.owner = ctx.accounts.owner.key();
        listing.listing_id = registry.total_listings;
        listing.location = Location {
            latitude,
            longitude,
            grid_x,
            grid_y,
            city: city.clone(),
            country: country.clone(),
        };
        listing.height_from = height_from;
        listing.height_to = height_to;
        listing.area_sqm = area_sqm;
        listing.price = price;
        listing.listing_type = listing_type;
        listing.status = ListingStatus::Active;
        listing.duration_days = duration_days;
        listing.created_at = Clock::get()?.unix_timestamp;
        listing.metadata_uri = metadata_uri;
        listing.buyer = None;

        registry.total_listings += 1;

        let location_index = &mut ctx.accounts.location_index;
        if location_index.listing_count == 0 {
            location_index.city = city.clone();
            location_index.country = country.clone();
        }
        location_index.listing_count += 1;

        Ok(())
    }
    
    pub fn purchase_air_rights(ctx: Context<PurchaseAirRights>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        
        require!(listing.status == ListingStatus::Active, ErrorCode::ListingNotActive);
        require!(listing.listing_type == ListingType::Sale, ErrorCode::NotForSale);

        let price = listing.price;
        let platform_fee = (price as u128)
            .checked_mul(ctx.accounts.registry.platform_fee_bps as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;
        let seller_amount = price.checked_sub(platform_fee).unwrap();

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.seller.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, seller_amount)?;

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.platform_treasury.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, platform_fee)?;

        listing.status = ListingStatus::Sold;
        listing.buyer = Some(ctx.accounts.buyer.key());

        Ok(())
    }

    pub fn lease_air_rights(ctx: Context<LeaseAirRights>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        
        require!(listing.status == ListingStatus::Active, ErrorCode::ListingNotActive);
        require!(listing.listing_type == ListingType::Lease, ErrorCode::NotForLease);

        let price = listing.price;
        let platform_fee = (price as u128)
            .checked_mul(ctx.accounts.registry.platform_fee_bps as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;
        let lessor_amount = price.checked_sub(platform_fee).unwrap();

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.lessee.to_account_info(),
                to: ctx.accounts.lessor.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, lessor_amount)?;

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.lessee.to_account_info(),
                to: ctx.accounts.platform_treasury.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, platform_fee)?;

        let lease = &mut ctx.accounts.lease_record;
        lease.listing_id = listing.listing_id;
        lease.lessor = listing.owner;
        lease.lessee = ctx.accounts.lessee.key();
        lease.start_date = Clock::get()?.unix_timestamp;
        lease.end_date = lease.start_date + (listing.duration_days as i64 * 86400);
        lease.amount_paid = price;
        lease.is_active = true;

        listing.status = ListingStatus::Leased;
        listing.buyer = Some(ctx.accounts.lessee.key());

        Ok(())
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        
        require!(listing.status == ListingStatus::Active, ErrorCode::ListingNotActive);
        require!(listing.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);

        listing.status = ListingStatus::Cancelled;

        // Decrement location index count
        let location_index = &mut ctx.accounts.location_index;
        location_index.listing_count = location_index.listing_count.saturating_sub(1);

        Ok(())
    }

    pub fn update_price(ctx: Context<UpdateListing>, new_price: u64) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        
        require!(listing.status == ListingStatus::Active, ErrorCode::ListingNotActive);
        require!(listing.owner == ctx.accounts.owner.key(), ErrorCode::Unauthorized);
        require!(new_price > 0, ErrorCode::InvalidPrice);

        listing.price = new_price;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Registry::INIT_SPACE,
        seeds = [b"registry"],
        bump
    )]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    latitude: i32,
    longitude: i32,
    height_from: u16,
    height_to: u16,
    area_sqm: u32,
    price: u64,
    listing_type: ListingType,
    duration_days: u32,
    city: String,
    country: String
)]
pub struct CreateListing<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Listing::INIT_SPACE,
        seeds = [
            b"listing",
            registry.total_listings.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub registry: Account<'info, Registry>,
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + LocationIndex::INIT_SPACE,
        seeds = [
            b"location",
            city.as_bytes(),
            country.as_bytes()
        ],
        bump
    )]
    pub location_index: Account<'info, LocationIndex>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseAirRights<'info> {
    #[account(
        mut,
        seeds = [b"listing", listing.listing_id.to_le_bytes().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Seller account receiving payment
    #[account(mut)]
    pub seller: AccountInfo<'info>,
    /// CHECK: Platform treasury
    #[account(mut)]
    pub platform_treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LeaseAirRights<'info> {
    #[account(
        mut,
        seeds = [b"listing", listing.listing_id.to_le_bytes().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub registry: Account<'info, Registry>,
    #[account(
        init,
        payer = lessee,
        space = 8 + LeaseRecord::INIT_SPACE,
        seeds = [
            b"lease",
            listing.listing_id.to_le_bytes().as_ref(),
            lessee.key().as_ref()
        ],
        bump
    )]
    pub lease_record: Account<'info, LeaseRecord>,
    #[account(mut)]
    pub lessee: Signer<'info>,
    /// CHECK: Lessor account receiving payment
    #[account(mut)]
    pub lessor: AccountInfo<'info>,
    /// CHECK: Platform treasury
    #[account(mut)]
    pub platform_treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(
        mut,
        seeds = [b"listing", listing.listing_id.to_le_bytes().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        mut,
        seeds = [
            b"location",
            listing.location.city.as_bytes(),
            listing.location.country.as_bytes()
        ],
        bump
    )]
    pub location_index: Account<'info, LocationIndex>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateListing<'info> {
    #[account(
        mut,
        seeds = [b"listing", listing.listing_id.to_le_bytes().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub owner: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Registry {
    pub authority: Pubkey,
    pub total_listings: u64,
    pub platform_fee_bps: u16, // Basis points (100 = 1%)
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub owner: Pubkey,
    pub listing_id: u64,
    pub location: Location,
    pub height_from: u16,
    pub height_to: u16,
    pub area_sqm: u32,
    pub price: u64,
    pub listing_type: ListingType,
    pub status: ListingStatus,
    pub duration_days: u32,
    pub created_at: i64,
    #[max_len(200)]
    pub metadata_uri: String,
    pub buyer: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Location {
    pub latitude: i32,      // latitude * 1_000_000
    pub longitude: i32,     // longitude * 1_000_000
    pub grid_x: u32,        // For efficient spatial search (auto-calculated)
    pub grid_y: u32,        // For efficient spatial search (auto-calculated)
    #[max_len(50)]
    pub city: String,       // "New York", "Mumbai", "Tokyo"
    #[max_len(3)]
    pub country: String,    // ISO country code: "US", "IN", "JP"
}

#[account]
#[derive(InitSpace)]
pub struct LocationIndex {
    #[max_len(50)]
    pub city: String,
    #[max_len(3)]
    pub country: String,
    pub listing_count: u32,
}

#[account]
#[derive(InitSpace)]
pub struct LeaseRecord {
    pub listing_id: u64,
    pub lessor: Pubkey,
    pub lessee: Pubkey,
    pub start_date: i64,
    pub end_date: i64,
    pub amount_paid: u64,
    pub is_active: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ListingType {
    Sale,
    Lease,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ListingStatus {
    Active,
    Sold,
    Leased,
    Cancelled,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Metadata URI exceeds maximum length")]
    MetadataUriTooLong,
    #[msg("City name exceeds maximum length")]
    CityNameTooLong,
    #[msg("Country code must be 2-3 characters")]
    CountryCodeInvalid,
    #[msg("Invalid height range")]
    InvalidHeightRange,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Listing is not active")]
    ListingNotActive,
    #[msg("Listing is not for sale")]
    NotForSale,
    #[msg("Listing is not for lease")]
    NotForLease,
    #[msg("Unauthorized")]
    Unauthorized,
}