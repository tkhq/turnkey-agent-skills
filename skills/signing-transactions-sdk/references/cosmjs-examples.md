# CosmJS Examples

Complete examples for signing Cosmos ecosystem transactions with `@turnkey/cosmjs`.

## Prerequisites

```bash
npm install @turnkey/sdk-server @turnkey/cosmjs @cosmjs/stargate @cosmjs/encoding
```

## Send Tokens (Celestia)

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeyDirectWallet } from "@turnkey/cosmjs";
import { SigningStargateClient } from "@cosmjs/stargate";
import { toHex } from "@cosmjs/encoding";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

// Initialize the Turnkey CosmJS wallet with "celestia" prefix
const wallet = await TurnkeyDirectWallet.init({
  config: {
    client: turnkey.apiClient(),
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    signWith: process.env.SIGN_WITH!,
  },
  prefix: "celestia",
});

const [account] = await wallet.getAccounts();
const senderAddress = account.address;

console.log("Wallet address:", senderAddress);

// Connect to Celestia testnet
const ENDPOINT = "https://rpc.celestia-arabica-11.com/";
const signingClient = await SigningStargateClient.connectWithSigner(ENDPOINT, wallet);

// Send tokens
const result = await signingClient.sendTokens(
  senderAddress,
  "celestia1vsvx8n7f8dh5udesqqhgrjutyun7zqrgehdq2l",
  [{ denom: "utia", amount: "100" }],
  {
    amount: [{ denom: "utia", amount: "20000" }],
    gas: "200000",
  },
  "Hello from Turnkey!",
);

console.log("TX hash:", result.transactionHash);
signingClient.disconnect();
```

## Using Different Chain Prefixes

The `prefix` parameter in `TurnkeyDirectWallet.init()` determines the address format. Change it based on the target chain:

| Chain | Prefix | Denom |
|---|---|---|
| Celestia | `celestia` | `utia` |
| Cosmos Hub | `cosmos` | `uatom` |
| Osmosis | `osmo` | `uosmo` |
| Injective | `inj` | `inj` |
