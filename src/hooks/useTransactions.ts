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
    console.log('Loaded transactions from storage:', loaded);
    console.log('Loaded transactions count:', loaded.length);
    setTransactions(loaded);
    setIsLoading(false);
  }, []);

  // Генерация UUID для уникальности timestamp (как в iOS)
  const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback для iOS Safari
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Округляет timestamp до одного знака после точки (как в iOS)
  const roundTimestamp = (timestamp: number): number => {
    return Math.round(timestamp * 10) / 10;
  };

  const addTransaction = useCallback((amount: string, category: string) => {
    // Генерируем уникальный timestamp как в iOS приложении
    const now = Date.now() / 1000; // секунды с 1970
    const baseTimestamp = now;
    
    // Генерируем UUID для уникальности (как в iOS)
    const uuid = generateUUID();
    const uuidString = uuid.replace(/-/g, '');
    const uuidPrefix = uuidString.substring(0, 12);
    
    // Конвертируем hex в число для уникального offset
    const uuidValue = parseInt(uuidPrefix, 16) % 1000000000000;
    const uniqueOffset = uuidValue / 1000000000000.0; // От 0 до 0.999999999999
    
    // Округляем до одного знака после точки (как в iOS)
    const roundedTimestamp = roundTimestamp(baseTimestamp + uniqueOffset);
    
    // Используем timestamp в формате ISO строки как ID (как вы указали: 2025-11-27T19:37:54Z)
    const timestampISO = new Date(roundedTimestamp * 1000).toISOString();
    
    const transaction: Transaction = {
      id: timestampISO, // Используем ISO строку timestamp как ID
      amount,
      category,
      date: new Date(roundedTimestamp * 1000),
      timestamp: roundedTimestamp,
    };

    setTransactions((prev) => {
      console.log('Previous transactions before add:', prev);
      const updated = [...prev, transaction];
      console.log('Updated transactions after add:', updated);
      
      try {
        transactionStorage.saveTransactions(updated);
        console.log('Transactions saved successfully');
        
        // Проверяем, что сохранилось
        const saved = transactionStorage.getTransactions();
        console.log('Verification - transactions in storage:', saved);
        console.log('Verification - transactions count:', saved.length);
      } catch (error) {
        console.error('Error saving transactions:', error);
      }
      
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

  const clearAllTransactions = useCallback(() => {
    setTransactions([]);
    transactionStorage.saveTransactions([]);
    // Также очищаем timestamp синхронизации
    transactionStorage.saveLastSyncTimestamp(0);
  }, []);

  return {
    transactions,
    isLoading,
    addTransaction,
    deleteTransaction,
    loadTransactions,
    hasUnsynchronizedTransactions,
    clearAllTransactions,
  };
}

