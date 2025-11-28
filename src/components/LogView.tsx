import type { Transaction } from '../types';
import { transactionFormatter } from '../utils/transactionFormatter';
import { budgetCalculator } from '../utils/budgetCalculator';

interface LogViewProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onNavigateToAdd: () => void;
  onNavigateToSettings: () => void;
  onSync: () => void;
  hasUnsynchronized: boolean;
}

export function LogView({
  transactions,
  onDeleteTransaction,
  onNavigateToAdd,
  onNavigateToSettings,
  onSync,
  hasUnsynchronized,
}: LogViewProps) {
  const grouped = transactionFormatter.groupByDate(transactions);
  const sortedDates = Object.keys(grouped)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())
    .filter((date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date <= today;
    });

  const monthSpent = budgetCalculator.getMonthSpentAmount(transactions);
  const monthString = transactions.length > 0
    ? transactionFormatter.getMonthString(new Date(transactions[0].date))
    : '';

  const handleCopyDay = (date: Date) => {
    const text = transactionFormatter.formatTransactionsForDate(transactions, date);
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {sortedDates.length > 0 && (
          <>
            {/* Month header */}
            <div className="flex justify-between items-center mb-4 px-2 py-2">
              <h2 className="text-xl font-bold">{monthString}</h2>
              <span className="text-lg">{Math.round(monthSpent)} RSD</span>
            </div>

            {/* Days */}
            {sortedDates.map((date) => {
              const dateKey = transactionFormatter.getDateKey(date);
              const dayTransactions = grouped[dateKey] || [];
              const dayTotal = dayTransactions
                .filter((t) => t.category !== 'бесплатный день')
                .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

              return (
                <div key={dateKey} className="mb-4">
                  <div
                    className="font-semibold px-2 py-1 cursor-pointer"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleCopyDay(date);
                    }}
                  >
                    {transactionFormatter.formatDate(date)}
                  </div>
                  {dayTotal === 0 && dayTransactions.some((t) => t.category === 'бесплатный день') ? (
                    <div className="px-2 py-1">0 бесплатный день</div>
                  ) : (
                    dayTransactions
                      .filter((t) => t.category !== 'бесплатный день')
                      .map((transaction) => (
                        <div
                          key={transaction.id}
                          className="px-2 py-1 flex justify-between"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onDeleteTransaction(transaction.id);
                          }}
                        >
                          <span>
                            {transaction.amount} {transactionFormatter.formatCategory(transaction.category)}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Sync button */}
      {hasUnsynchronized && (
        <button
          onClick={onSync}
          className="fixed bottom-20 right-4 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center">
        <button
          onClick={onNavigateToSettings}
          className="text-blue-500"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          onClick={onNavigateToAdd}
          className="text-blue-500"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

