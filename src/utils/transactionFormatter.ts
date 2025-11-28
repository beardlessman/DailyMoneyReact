import type { Transaction } from '../types';

export const transactionFormatter = {
  formatCategory(category: string): string {
    const lower = category.toLowerCase();
    if (lower === 'продукты' || lower === 'доставка') {
      return `${category} еда`;
    }
    if (lower === 'алкоголь' || lower === 'кальян') {
      return `${category} алко`;
    }
    return category;
  },

  formatTransactions(transactions: Transaction[]): string {
    if (transactions.length === 0) return '';

    const grouped = this.groupByDate(transactions);
    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    let result = '';
    let currentMonth = '';

    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      const monthKey = this.getMonthKey(date);
      
      if (monthKey !== currentMonth) {
        if (result) result += '\n';
        result += `${this.getMonthString(date)}\n`;
        currentMonth = monthKey;
      }

      const dayTransactions = grouped[dateStr];
      const dayTotal = dayTransactions
        .filter((t) => t.category !== 'бесплатный день')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

      result += `\n${this.formatDate(date)}\n`;
      
      if (dayTotal === 0 && dayTransactions.some((t) => t.category === 'бесплатный день')) {
        result += '0 бесплатный день\n';
      } else {
        for (const transaction of dayTransactions) {
          if (transaction.category === 'бесплатный день') continue;
          result += `${transaction.amount} ${this.formatCategory(transaction.category)}\n`;
        }
      }
    }

    return result;
  },

  formatTransactionsForDate(transactions: Transaction[], targetDate: Date): string {
    const targetDateStr = this.getDateKey(targetDate);
    const dayTransactions = transactions.filter(
      (t) => this.getDateKey(new Date(t.date)) === targetDateStr
    );

    if (dayTransactions.length === 0) return '';

    const date = new Date(targetDate);
    let result = `${this.formatDate(date)}\n`;

    const dayTotal = dayTransactions
      .filter((t) => t.category !== 'бесплатный день')
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

    if (dayTotal === 0 && dayTransactions.some((t) => t.category === 'бесплатный день')) {
      result += '0 бесплатный день\n';
    } else {
      for (const transaction of dayTransactions) {
        if (transaction.category === 'бесплатный день') continue;
        result += `${transaction.amount} ${this.formatCategory(transaction.category)}\n`;
      }
    }

    return result;
  },

  groupByDate(transactions: Transaction[]): Record<string, Transaction[]> {
    const grouped: Record<string, Transaction[]> = {};
    for (const transaction of transactions) {
      const dateKey = this.getDateKey(new Date(transaction.date));
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(transaction);
    }
    // Сортируем транзакции внутри каждого дня по timestamp (новые первыми)
    for (const key in grouped) {
      grouped[key].sort((a, b) => b.timestamp - a.timestamp);
    }
    return grouped;
  },

  getDateKey(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  },

  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}.${month}.${year}`;
  },

  getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}`;
  },

  getMonthString(date: Date): string {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[date.getMonth()];
  },
};

