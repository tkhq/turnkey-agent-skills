# ethers.js Usage Examples

Full setup is in the main SKILL.md. These examples assume `connectedSigner` and `provider` are already initialized.

## Send ETH

```typescript
const tx = await connectedSigner.sendTransaction({
  to: "0xRecipientAddress",
  value: ethers.parseEther("0.001"),
});
const receipt = await tx.wait();
console.log("Confirmed in block:", receipt?.blockNumber);
```

## Sign a message (EIP-191)

```typescript
const signature = await connectedSigner.signMessage("Hello from Turnkey agent");
const recovered = ethers.verifyMessage("Hello from Turnkey agent", signature);
console.log("Recovered:", recovered); // should match SIGN_WITH address
```

## Sign EIP-712 typed data

```typescript
const signature = await connectedSigner.signTypedData(
  {
    name: "MyApp",
    version: "1",
    chainId: 11155111,
    verifyingContract: "0xContractAddress",
  },
  {
    Order: [
      { name: "buyer", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    buyer: await connectedSigner.getAddress(),
    amount: ethers.parseUnits("100", 18),
  }
);
```

## Interact with a contract

```typescript
const contract = new ethers.Contract(
  "0xTokenAddress",
  ["function transfer(address to, uint256 amount) returns (bool)"],
  connectedSigner
);
const tx = await contract.transfer("0xRecipient", ethers.parseUnits("10", 6));
await tx.wait();
```

## Connect to a different chain

```typescript
const baseProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
const baseSigner = signer.connect(baseProvider);
// Same TurnkeySigner instance, different provider — works across any EVM chain
```
