# Air Trade

Purchase, Sell, Lease air rights on Solana.

## TODO
- if there are enties for location with same city and country then display errors.
``` rust 
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + LocationIndex::INIT_SPACE,
        seeds = [
            b"location",
            city.as_bytes(),
            country.as_bytes(),
            // probably fix add number here to increase everytime location_index city and country is same.
        ],
        bump
    )]
    pub location_index: Account<'info, LocationIndex>,
```