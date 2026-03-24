# Full Setup Walkthrough: EVM + Solana

This walkthrough shows the most common setup path: a single wallet with Ethereum and Solana accounts. Adapt for your target chains using the address format table in `creating-wallets-api`.

## Step 1: Install CLI

```bash
brew install tkhq/tap/turnkey
turnkey version
# Expected: turnkey vX.Y.Z
```

## Step 2: Set Organization ID

```bash
export ORGANIZATION_ID="<your-org-id-from-dashboard>"
```

Get this from the Turnkey dashboard at app.turnkey.com. It is a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`.

## Step 3: Generate API Key

```bash
turnkey generate api-key --organization $ORGANIZATION_ID --key-name default
```

Expected output:
```
New API key generated:
Public key: 04abcdef...  (hex-encoded P-256 public key)
Private key stored at: /Users/<you>/.config/turnkey/keys/default/
```

The public key is automatically registered with your organization if this is your first key.

## Step 4: Verify CLI Connectivity

```bash
turnkey request --path /public/v1/query/list_wallets --body '{}' --organization $ORGANIZATION_ID
```

Expected output:
```json
{
  "wallets": []
}
```

An empty list is correct for a new organization. If you get an authentication error, check that your key files exist at `~/.config/turnkey/keys/default/`.

## Step 5: Create Wallet with EVM + Solana Accounts

```bash
turnkey request --path /public/v1/submit/create_wallet --body '{
  "walletName": "default",
  "accounts": [
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'\''/'60'\''/'0'\''/'0/0",
      "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
    },
    {
      "curve": "CURVE_ED25519",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'\''/'501'\''/'0'\''/'0'\''",
      "addressFormat": "ADDRESS_FORMAT_SOLANA"
    }
  ],
  "mnemonicLength": 12
}' --organization $ORGANIZATION_ID
```

Expected output includes `walletId` and two addresses:
```json
{
  "walletId": "wlt-...",
  "addresses": [
    "0x1234...abcd",
    "ABC123...xyz"
  ]
}
```

Record both addresses.

## Step 6: Verify Wallet and Accounts

```bash
turnkey wallets list --key-name default
turnkey wallets accounts list --wallet default
```

Expected: wallet listed with two accounts showing Ethereum and Solana addresses.

## Step 7: Test Signature (Ethereum)

```bash
turnkey raw sign \
  --signer 0x1234...abcd \
  --payload "Hello, Turnkey!" \
  --payload-encoding PAYLOAD_ENCODING_TEXT_UTF8 \
  --hash-function HASH_FUNCTION_KECCAK256
```

Expected output:
```json
{
  "r": "0x...",
  "s": "0x...",
  "v": "0x1b"
}
```

## Step 8: Test Signature (Solana)

```bash
turnkey raw sign \
  --signer ABC123...xyz \
  --payload "Hello, Turnkey!" \
  --payload-encoding PAYLOAD_ENCODING_TEXT_UTF8 \
  --hash-function HASH_FUNCTION_NOT_APPLICABLE
```

Note the different hash function: Ed25519 (Solana) does not pre-hash, so use `HASH_FUNCTION_NOT_APPLICABLE`.

## Setup Complete

At this point you have:
- CLI installed and authenticated
- A wallet with Ethereum and Solana accounts
- Verified signing on both chains

**Next steps:**
- Fund the addresses on testnet (use a faucet for Sepolia ETH or Devnet SOL)
- Sign real transactions (see `signing-transactions-api` for chain-specific methods)
- Add team members (see Phase 4 in the main SKILL.md)
- Add policies for production (see `secure-wallets-workflow`)

## Variations

### EVM-Only Setup

Remove the Solana account from Step 5:

```bash
turnkey request --path /public/v1/submit/create_wallet --body '{
  "walletName": "default",
  "accounts": [
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'\''/'60'\''/'0'\''/'0/0",
      "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
    }
  ],
  "mnemonicLength": 12
}' --organization $ORGANIZATION_ID
```

### Adding Bitcoin

Add a Bitcoin account to your existing wallet after creation:

```bash
turnkey wallets accounts create \
  --wallet default \
  --address-format ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH
```

For the full list of supported chains and address formats, see the table in `creating-wallets-api`.

### Adding a Second Team Member

```bash
# Generate their key
turnkey generate api-key --organization $ORGANIZATION_ID --key-name bob-key

# Create user with that key
turnkey request --path /public/v1/submit/create_users --body '{
  "users": [{
    "userName": "bob",
    "userEmail": "bob@example.com",
    "apiKeys": [{
      "apiKeyName": "bob-key",
      "publicKey": "<BOB_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": []
  }]
}' --organization $ORGANIZATION_ID
```

See `managing-credentials-api` for user provisioning details, sub-organization patterns, and key rotation.
