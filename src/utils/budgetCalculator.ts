import type { Transaction } from '../types';

// Helper functions
function getLastCalculationDate(): Date | null {
  const dateStr = localStorage.getItem('daily_budget_date');
  return dateStr ? new Date(dateStr) : null;
}

function getLastMonthlyAmount(): number {
  const amount = localStorage.getItem('last_monthly_amount_for_budget');
  return amount ? parseFloat(amount) : 0;
}

function shouldRecalculate(
  lastDate: Date | null,
  lastMonthlyAmount: number,
  monthlyAmount: number,
  today: Date,
  today6AM: Date,
  now: Date
): boolean {
  if (!lastDate) return true;

  const lastDateDay = new Date(lastDate);
  lastDateDay.setHours(0, 0, 0, 0);

  if (lastDateDay.getTime() < today.getTime()) return true;

  if (
    lastDateDay.getTime() === today.getTime() &&
    lastDate.getTime() < today6AM.getTime() &&
    now.getTime() >= today6AM.getTime()
  ) {
    return true;
  }

  if (Math.abs(lastMonthlyAmount - monthlyAmount) > 0.01) return true;

  return false;
}

function getSavedDailyBudget(): number {
  const budget = localStorage.getItem('daily_budget');
  return budget ? parseFloat(budget) : 0;
}

function saveDailyBudget(budget: number, date: Date, monthlyAmount: number): void {
  localStorage.setItem('daily_budget', budget.toString());
  localStorage.setItem('daily_budget_date', date.toISOString());
  localStorage.setItem('last_monthly_amount_for_budget', monthlyAmount.toString());
}

export const budgetCalculator = {
  getToday6AM(): Date {
    const now = new Date();
    const today6AM = new Date(now);
    today6AM.setHours(6, 0, 0, 0);
    return today6AM;
  },

  calculateDailyBudget(
    monthlyAmount: number,
    transactions: Transaction[]
  ): number {
    const now = new Date();
    const today6AM = this.getToday6AM();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Проверяем, нужно ли пересчитать дневной бюджет
    const lastCalculationDate = getLastCalculationDate();
    const lastMonthlyAmount = getLastMonthlyAmount();
    const shouldRecalc = shouldRecalculate(
      lastCalculationDate,
      lastMonthlyAmount,
      monthlyAmount,
      today,
      today6AM,
      now
    );

    if (shouldRecalc) {
      const monthSpent = this.getMonthSpentAmount(transactions);
      const remainingBudget = monthlyAmount - monthSpent;

      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const endOfMonthDay = new Date(endOfMonth);
      endOfMonthDay.setHours(0, 0, 0, 0);

      const daysRemaining =
        Math.ceil((endOfMonthDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysRemainingIncludingToday = Math.max(1, daysRemaining);

      const calculatedBudget = remainingBudget / daysRemainingIncludingToday;
      const roundedBudget = Math.floor(calculatedBudget / 500) * 500;

      saveDailyBudget(roundedBudget, now, monthlyAmount);
      return roundedBudget;
    } else {
      const savedBudget = getSavedDailyBudget();
      return savedBudget > 0 ? savedBudget : 0;
    }
  },

  getTodaySpentAmount(transactions: Transaction[]): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return transactions
      .filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= today && tDate < tomorrow && t.category !== 'бесплатный день';
      })
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
  },

  getMonthSpentAmount(transactions: Transaction[]): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return transactions
      .filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= startOfMonth && tDate <= endOfMonth && t.category !== 'бесплатный день';
      })
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
  },
};

