# API Key Examples

Complete examples for generating, managing, and rotating API keys using `turnkey request`.

## Generate keys with different curves

### P-256 (default)

```bash
turnkey generate api-key --organization $ORGANIZATION_ID --key-name my-p256-key --curve p256
```

### secp256k1

```bash
turnkey generate api-key --organization $ORGANIZATION_ID --key-name my-secp-key --curve secp256k1
```

### Ed25519

```bash
turnkey generate api-key --organization $ORGANIZATION_ID --key-name my-ed-key --curve ed25519
```

Each command prints the public key to stdout and saves the private key to `~/.config/turnkey/keys/<key-name>/`.

## Create multiple users in one API call

```bash
turnkey request --path /public/v1/submit/create_users --body '{
  "users": [
    {
      "userName": "alice",
      "userEmail": "alice@example.com",
      "apiKeys": [{
        "apiKeyName": "alice-key",
        "publicKey": "<ALICE_PUBLIC_KEY>",
        "curveType": "API_KEY_CURVE_P256"
      }],
      "authenticators": [],
      "userTags": ["engineering"]
    },
    {
      "userName": "bob",
      "userEmail": "bob@example.com",
      "apiKeys": [{
        "apiKeyName": "bob-key",
        "publicKey": "<BOB_PUBLIC_KEY>",
        "curveType": "API_KEY_CURVE_P256"
      }],
      "authenticators": [],
      "userTags": ["operations"]
    },
    {
      "userName": "charlie",
      "userEmail": "charlie@example.com",
      "apiKeys": [
        {
          "apiKeyName": "charlie-primary",
          "publicKey": "<CHARLIE_PUBLIC_KEY_1>",
          "curveType": "API_KEY_CURVE_P256"
        },
        {
          "apiKeyName": "charlie-backup",
          "publicKey": "<CHARLIE_PUBLIC_KEY_2>",
          "curveType": "API_KEY_CURVE_ED25519"
        }
      ],
      "authenticators": [],
      "userTags": ["admin"]
    }
  ]
}' --organization $ORGANIZATION_ID
```

A single user can have multiple API keys with different curves. This is useful for providing backup access or supporting different authentication flows.

## Get user details

```bash
turnkey request --path /public/v1/query/get_user --body '{
  "userId": "<USER_ID>"
}' --organization $ORGANIZATION_ID
```

The response includes the user's API keys (public keys only), authenticators, and tags.

## Key rotation pattern

Key rotation follows a three-step process: create the new key, verify it works, then delete the old key.

### Step 1: Generate a new API key

```bash
turnkey generate api-key --organization $ORGANIZATION_ID --key-name rotated-key
# Save the printed public key for the next step
```

### Step 2: Register the new key with your user

```bash
turnkey request --path /public/v1/submit/create_api_keys --body '{
  "userId": "<YOUR_USER_ID>",
  "apiKeys": [{
    "apiKeyName": "rotated-key",
    "publicKey": "<NEW_PUBLIC_KEY>",
    "curveType": "API_KEY_CURVE_P256"
  }]
}' --organization $ORGANIZATION_ID
```

### Step 3: Verify the new key works

```bash
turnkey request --path /public/v1/query/list_users --body '{}' \
  --organization $ORGANIZATION_ID \
  --key-name rotated-key
```

If this returns successfully, the new key is working.

### Step 4: Delete the old key

```bash
turnkey request --path /public/v1/submit/delete_api_keys --body '{
  "userId": "<YOUR_USER_ID>",
  "apiKeyIds": ["<OLD_API_KEY_ID>"]
}' --organization $ORGANIZATION_ID --key-name rotated-key
```

Use the new key (`--key-name rotated-key`) to authenticate the deletion request. The `apiKeyIds` field accepts an array, so you can delete multiple old keys at once.

## List all API keys for a user

To see all API keys associated with a user, use `get_user` and inspect the `apiKeys` field in the response:

```bash
turnkey request --path /public/v1/query/get_user --body '{
  "userId": "<USER_ID>"
}' --organization $ORGANIZATION_ID
```

The response includes each key's `apiKeyId`, `apiKeyName`, and `publicKey`. Use the `apiKeyId` values when deleting keys.
