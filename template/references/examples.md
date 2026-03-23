# Examples

## Basic Usage

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

// Replace with your skill's specific API call
const result = await turnkey.apiClient().yourMethod({
  // parameters
});
```

## Advanced Usage

Add more examples as needed. Each example should be a complete,
self-contained TypeScript snippet that compiles.
