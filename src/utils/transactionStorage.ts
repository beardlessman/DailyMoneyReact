import type { Transaction } from '../types';

const STORAGE_KEY = 'daily_money_transactions';
const MONTHLY_AMOUNT_KEY = 'monthly_amount';
const LAST_SYNC_TIMESTAMP_KEY = 'last_sync_timestamp';

export const transactionStorage = {
  // Transactions
  getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        console.log('No transactions in storage');
        return [];
      }
      const parsed = JSON.parse(data);
      console.log('Parsed transactions from storage:', parsed);
      const transactions = parsed.map((t: any) => {
        const date = new Date(t.date);
        console.log('Parsing transaction date:', t.date, '->', date);
        return {
          ...t,
          date: date,
        };
      });
      console.log('Final transactions after parsing:', transactions);
      return transactions;
    } catch (error) {
      console.error('Error loading transactions:', error);
      return [];
    }
  },

  saveTransactions(transactions: Transaction[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save transactions:', error);
    }
  },

  // Monthly amount
  getMonthlyAmount(): number {
    const amount = localStorage.getItem(MONTHLY_AMOUNT_KEY);
    return amount ? parseFloat(amount) : 120000;
  },

  saveMonthlyAmount(amount: number): void {
    localStorage.setItem(MONTHLY_AMOUNT_KEY, amount.toString());
  },

  // Last sync timestamp
  getLastSyncTimestamp(): number {
    const timestamp = localStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
    return timestamp ? parseFloat(timestamp) : 0;
  },

  saveLastSyncTimestamp(timestamp: number): void {
    localStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, timestamp.toString());
  },
};

