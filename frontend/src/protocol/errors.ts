const ABORT_MESSAGES: Record<number, string> = {
  1: 'Only the Series Writer can perform this action.',
  2: 'This action is not allowed at the current lifecycle stage.',
  3: 'Expiry must be in the future when launching a Series.',
  4: 'The Option Coin TreasuryCap must have zero supply before creating a Vault.',
  5: 'Payment or amount does not match the Strike for this Series.',
  6: 'Withdraw Remaining is not available until the Exercise Window closes.',
  7: 'Insufficient collateral for the requested amount.',
  8: 'This action does not match the Series direction (Call vs Put).',
}

/** Map a tokensmith abort code to a human-readable message. */
export function abortCodeToMessage(code: number): string {
  return ABORT_MESSAGES[code] ?? `Transaction failed (abort code ${code}).`
}

/** Extract a user-facing message from a transaction or wallet error. */
export function formatTransactionError(error: unknown): string {
  if (!error) return 'Transaction failed.'
  const message = error instanceof Error ? error.message : String(error)

  const abortMatch =
    message.match(/MoveAbort.*?(\d+)/i) ??
    message.match(/abort[_ ]code[:\s]+(\d+)/i) ??
    message.match(/error code[:\s]+(\d+)/i)

  if (abortMatch) {
    const code = Number(abortMatch[1])
    if (ABORT_MESSAGES[code]) return ABORT_MESSAGES[code]
  }

  if (/user rejected|rejected from user|cancelled/i.test(message)) {
    return 'Transaction was rejected in your wallet.'
  }
  if (/insufficient gas/i.test(message)) {
    return 'Insufficient SUI for gas. Request testnet SUI from the official faucet.'
  }

  return message.length > 200 ? `${message.slice(0, 200)}…` : message
}

export function explorerTxUrl(digest: string, network = 'testnet'): string {
  return `https://suiscan.xyz/${network}/tx/${digest}`
}
