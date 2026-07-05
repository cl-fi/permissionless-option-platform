import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from '@mysten/dapp-kit'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import type { Transaction } from '@mysten/sui/transactions'
import {
  explorerTxUrl,
  formatTransactionError,
  type TransactionPhase,
} from '../protocol'

export function useTransactionExecution() {
  const account = useCurrentAccount()
  const client = useSuiClient()
  const queryClient = useQueryClient()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()
  const [phase, setPhase] = useState<TransactionPhase>('idle')
  const [digest, setDigest] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setPhase('idle')
    setDigest(null)
    setError(null)
  }, [])

  const execute = useCallback(
    async (buildTx: () => Transaction | Promise<Transaction>) => {
      if (!account) throw new Error('Connect a wallet first')
      reset()
      setPhase('signing')
      try {
        const tx = await buildTx()
        setPhase('executing')
        const result = await signAndExecute({ transaction: tx })
        setDigest(result.digest)
        setPhase('confirmed')
        await client.waitForTransaction({ digest: result.digest })
        await queryClient.invalidateQueries()
        return result
      } catch (err) {
        setError(formatTransactionError(err))
        setPhase('failed')
        throw err
      }
    },
    [account, client, queryClient, reset, signAndExecute],
  )

  return {
    phase,
    digest,
    error,
    execute,
    reset,
    explorerUrl: digest ? explorerTxUrl(digest) : null,
  }
}
