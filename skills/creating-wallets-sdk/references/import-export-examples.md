# Import and Export Examples

All examples use the same Turnkey client initialization:

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();
```

---

## Export a Wallet (Mnemonic Backup)

Export retrieves the wallet's mnemonic phrase in an encrypted bundle, which you decrypt client-side.

```typescript
import { generateP256KeyPair, decryptExportBundle } from "@turnkey/crypto";

// Step 1: Generate an encryption key pair
const keyPair = generateP256KeyPair();

// Step 2: Export the wallet (returns encrypted bundle)
const { exportBundle } = await client.exportWallet({
  walletId: "<WALLET_ID>",
  targetPublicKey: keyPair.publicKeyUncompressed,
});

// Step 3: Decrypt the bundle to get the mnemonic
const mnemonic = await decryptExportBundle({
  exportBundle,
  embeddedKey: keyPair.privateKey,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  returnMnemonic: true,
});

console.log("Mnemonic:", mnemonic);
```

Install the crypto package:

```bash
npm install @turnkey/crypto
```

---

## Export a Private Key

Export a standalone private key (not an HD wallet) as raw key material.

```typescript
import { generateP256KeyPair, decryptExportBundle } from "@turnkey/crypto";

const keyPair = generateP256KeyPair();

const { exportBundle } = await client.exportPrivateKey({
  privateKeyId: "<PRIVATE_KEY_ID>",
  targetPublicKey: keyPair.publicKeyUncompressed,
});

const privateKeyHex = await decryptExportBundle({
  exportBundle,
  embeddedKey: keyPair.privateKey,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  returnMnemonic: false,
});
```

---

## Export a Wallet Account

Export the private key for a single wallet account (derived address).

```typescript
import { generateP256KeyPair, decryptExportBundle } from "@turnkey/crypto";

const keyPair = generateP256KeyPair();

const { exportBundle } = await client.exportWalletAccount({
  address: "<WALLET_ACCOUNT_ADDRESS>",
  targetPublicKey: keyPair.publicKeyUncompressed,
});

const accountPrivateKey = await decryptExportBundle({
  exportBundle,
  embeddedKey: keyPair.privateKey,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  returnMnemonic: false,
});
```

---

## Import a Wallet (Restore from Mnemonic)

Import brings an external mnemonic into Turnkey's secure enclave. The mnemonic is encrypted before transmission.

```typescript
import { encryptWalletToBundle } from "@turnkey/crypto";

// Step 1: Initialize import (creates a secure channel)
const { importBundle } = await client.initImportWallet({
  userId: "<USER_ID>",
});

// Step 2: Encrypt the mnemonic for secure transmission
const encryptedBundle = await encryptWalletToBundle({
  mnemonic: "your twelve word mnemonic phrase goes here abandon ability ...",
  importBundle,
  userId: "<USER_ID>",
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

// Step 3: Import the wallet
const wallet = await client.importWallet({
  userId: "<USER_ID>",
  walletName: "Imported Wallet",
  encryptedBundle,
  accounts: [
    {
      curve: "CURVE_SECP256K1",
      pathFormat: "PATH_FORMAT_BIP32",
      path: "m/44'/60'/0'/0/0",
      addressFormat: "ADDRESS_FORMAT_ETHEREUM",
    },
  ],
});
```

---

## Import a Private Key

```typescript
import { encryptPrivateKeyToBundle } from "@turnkey/crypto";

// Step 1: Initialize import
const { importBundle } = await client.initImportPrivateKey({
  userId: "<USER_ID>",
});

// Step 2: Encrypt the private key
const encryptedBundle = await encryptPrivateKeyToBundle({
  privateKey: "your-hex-encoded-private-key",
  keyFormat: "HEXADECIMAL",
  importBundle,
  userId: "<USER_ID>",
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

// Step 3: Import
const key = await client.importPrivateKey({
  userId: "<USER_ID>",
  privateKeyName: "Imported Key",
  encryptedBundle,
  curve: "CURVE_SECP256K1",
  addressFormats: ["ADDRESS_FORMAT_ETHEREUM"],
});
```

### Key Format Options

| Format | Value | Use for |
|--------|-------|---------|
| Mnemonic | `"MNEMONIC"` | Standard BIP-39 seed phrases (wallet import only) |
| Hexadecimal | `"HEXADECIMAL"` | Raw private key bytes as hex string |
| Solana | `"SOLANA"` | 64-byte Solana keypair format (secret + public key) |
