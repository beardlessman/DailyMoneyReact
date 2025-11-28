export interface Transaction {
  id: string;
  amount: string;
  category: string;
  date: Date;
  timestamp: number;
}

export type View = 'add' | 'log' | 'settings';


