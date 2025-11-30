/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/air.json`.
 */
export type Air = {
  "address": "3zMwSoPMzhJtE4fsNdZ4qg7NfvEmJzswBRC3TzJbjRR8",
  "metadata": {
    "name": "air",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelListing",
      "discriminator": [
        41,
        183,
        50,
        232,
        230,
        233,
        157,
        70
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "listing.listing_id",
                "account": "listing"
              }
            ]
          }
        },
        {
          "name": "locationIndex",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  99,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "listing.location.city",
                "account": "listing"
              },
              {
                "kind": "account",
                "path": "listing.location.country",
                "account": "listing"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "createListing",
      "docs": [
        "List air rights for sale or lease"
      ],
      "discriminator": [
        18,
        168,
        45,
        24,
        191,
        31,
        117,
        54
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "registry.total_listings",
                "account": "registry"
              }
            ]
          }
        },
        {
          "name": "registry",
          "writable": true
        },
        {
          "name": "locationIndex",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  99,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "city"
              },
              {
                "kind": "arg",
                "path": "country"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "latitude",
          "type": "i32"
        },
        {
          "name": "longitude",
          "type": "i32"
        },
        {
          "name": "heightFrom",
          "type": "u16"
        },
        {
          "name": "heightTo",
          "type": "u16"
        },
        {
          "name": "areaSqm",
          "type": "u32"
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "listingType",
          "type": {
            "defined": {
              "name": "listingType"
            }
          }
        },
        {
          "name": "durationDays",
          "type": "u32"
        },
        {
          "name": "city",
          "type": "string"
        },
        {
          "name": "country",
          "type": "string"
        },
        {
          "name": "metadataUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "initializeRegistry",
      "discriminator": [
        189,
        181,
        20,
        17,
        174,
        57,
        249,
        59
      ],
      "accounts": [
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "leaseAirRights",
      "discriminator": [
        158,
        68,
        224,
        226,
        174,
        211,
        76,
        1
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "listing.listing_id",
                "account": "listing"
              }
            ]
          }
        },
        {
          "name": "registry"
        },
        {
          "name": "leaseRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  101,
                  97,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "listing.listing_id",
                "account": "listing"
              },
              {
                "kind": "account",
                "path": "lessee"
              }
            ]
          }
        },
        {
          "name": "lessee",
          "writable": true,
          "signer": true
        },
        {
          "name": "lessor",
          "writable": true
        },
        {
          "name": "platformTreasury",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "purchaseAirRights",
      "discriminator": [
        170,
        240,
        7,
        84,
        63,
        221,
        73,
        222
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "listing.listing_id",
                "account": "listing"
              }
            ]
          }
        },
        {
          "name": "registry"
        },
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "seller",
          "writable": true
        },
        {
          "name": "platformTreasury",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updatePrice",
      "discriminator": [
        61,
        34,
        117,
        155,
        75,
        34,
        123,
        208
      ],
      "accounts": [
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "listing.listing_id",
                "account": "listing"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newPrice",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "leaseRecord",
      "discriminator": [
        83,
        102,
        121,
        177,
        32,
        140,
        206,
        150
      ]
    },
    {
      "name": "listing",
      "discriminator": [
        218,
        32,
        50,
        73,
        43,
        134,
        26,
        58
      ]
    },
    {
      "name": "locationIndex",
      "discriminator": [
        64,
        3,
        20,
        203,
        204,
        168,
        46,
        11
      ]
    },
    {
      "name": "registry",
      "discriminator": [
        47,
        174,
        110,
        246,
        184,
        182,
        252,
        218
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "metadataUriTooLong",
      "msg": "Metadata URI exceeds maximum length"
    },
    {
      "code": 6001,
      "name": "cityNameTooLong",
      "msg": "City name exceeds maximum length"
    },
    {
      "code": 6002,
      "name": "countryCodeInvalid",
      "msg": "Country code must be 2-3 characters"
    },
    {
      "code": 6003,
      "name": "invalidHeightRange",
      "msg": "Invalid height range"
    },
    {
      "code": 6004,
      "name": "invalidPrice",
      "msg": "Invalid price"
    },
    {
      "code": 6005,
      "name": "listingNotActive",
      "msg": "Listing is not active"
    },
    {
      "code": 6006,
      "name": "notForSale",
      "msg": "Listing is not for sale"
    },
    {
      "code": 6007,
      "name": "notForLease",
      "msg": "Listing is not for lease"
    },
    {
      "code": 6008,
      "name": "unauthorized",
      "msg": "unauthorized"
    }
  ],
  "types": [
    {
      "name": "leaseRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "listingId",
            "type": "u64"
          },
          {
            "name": "lessor",
            "type": "pubkey"
          },
          {
            "name": "lessee",
            "type": "pubkey"
          },
          {
            "name": "startDate",
            "type": "i64"
          },
          {
            "name": "endDate",
            "type": "i64"
          },
          {
            "name": "amountPaid",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "listing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "listingId",
            "type": "u64"
          },
          {
            "name": "location",
            "type": {
              "defined": {
                "name": "location"
              }
            }
          },
          {
            "name": "heightFrom",
            "type": "u16"
          },
          {
            "name": "heightTo",
            "type": "u16"
          },
          {
            "name": "areaSqm",
            "type": "u32"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "listingType",
            "type": {
              "defined": {
                "name": "listingType"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "listingStatus"
              }
            }
          },
          {
            "name": "durationDays",
            "type": "u32"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "metadataUri",
            "type": "string"
          },
          {
            "name": "buyer",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "listingStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "sold"
          },
          {
            "name": "leased"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "listingType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "sale"
          },
          {
            "name": "lease"
          }
        ]
      }
    },
    {
      "name": "location",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "latitude",
            "type": "i32"
          },
          {
            "name": "longitude",
            "type": "i32"
          },
          {
            "name": "gridX",
            "type": "u32"
          },
          {
            "name": "gridY",
            "type": "u32"
          },
          {
            "name": "city",
            "type": "string"
          },
          {
            "name": "country",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "locationIndex",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "city",
            "type": "string"
          },
          {
            "name": "country",
            "type": "string"
          },
          {
            "name": "listingCount",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "registry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "totalListings",
            "type": "u64"
          },
          {
            "name": "platformFeeBps",
            "type": "u16"
          }
        ]
      }
    }
  ]
};
