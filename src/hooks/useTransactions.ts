import { useState, useEffect, useCallback } from 'react';
import type { Transaction } from '../types';
import { transactionStorage } from '../utils/transactionStorage';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = useCallback(() => {
    setIsLoading(true);
    const loaded = transactionStorage.getTransactions();
    setTransactions(loaded);
    setIsLoading(false);
  }, []);

  const addTransaction = useCallback((amount: string, category: string) => {
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      amount,
      category,
      date: new Date(),
      timestamp: Math.round(Date.now() / 1000),
    };

    setTransactions((prev) => {
      const updated = [...prev, transaction];
      transactionStorage.saveTransactions(updated);
      return updated;
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      transactionStorage.saveTransactions(updated);
      return updated;
    });
  }, []);

  const hasUnsynchronizedTransactions = useCallback((): boolean => {
    const lastSyncTimestamp = transactionStorage.getLastSyncTimestamp();
    if (lastSyncTimestamp === 0) {
      return transactions.length > 0;
    }
    return transactions.some((t) => t.timestamp > lastSyncTimestamp);
  }, [transactions]);

  return {
    transactions,
    isLoading,
    addTransaction,
    deleteTransaction,
    loadTransactions,
    hasUnsynchronizedTransactions,
  };
}

