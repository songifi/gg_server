
export interface TokenTransfer {
    amount: string; // Amount as a string (for precision with big numbers)
    tokenAddress: string; // Contract address of the token
    tokenSymbol: string; // Symbol of the token (ETH, USDC, etc.)
    tokenDecimals: number; // Number of decimals for the token
    transactionHash?: string; // StarkNet transaction hash (optional until confirmed)
    status: "pending" | "confirmed" | "failed"; // Transaction status
  }
  