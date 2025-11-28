import { useState } from 'react';
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
  isSyncing?: boolean;
  syncError?: string | null;
}

// Функция для виброотдачи (haptic feedback) - как в iOS приложении
const triggerHapticFeedback = () => {
  try {
    // Проверяем поддержку Vibration API
    if ('vibrate' in navigator) {
      // Для iOS PWA и Android - используем короткий паттерн вибрации
      // Паттерн: короткий импульс (10ms), пауза (5ms), еще один короткий импульс (10ms)
      // Это создает ощущение "легкого удара", как в iOS
      navigator.vibrate([10, 5, 10]);
    }
  } catch (e) {
    // Игнорируем ошибки, если вибрация не поддерживается
    console.debug('Vibration not supported:', e);
  }
};

export function LogView({
  transactions,
  onDeleteTransaction,
  onNavigateToAdd,
  onNavigateToSettings,
  onSync,
  hasUnsynchronized,
  isSyncing = false,
  syncError = null,
}: LogViewProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    transactionId: string | null;
  } | null>(null);

  const grouped = transactionFormatter.groupByDate(transactions);
  
  // Получаем все даты из группировки
  const allDates = Object.keys(grouped).map((d) => {
    // Парсим дату из строки формата YYYY-MM-DD (локальная дата)
    const [year, month, day] = d.split('-').map(Number);
    return new Date(year, month - 1, day);
  });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const sortedDates = allDates
    .filter((date) => {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      return dateStart <= today;
    })
    .sort((a, b) => b.getTime() - a.getTime());

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
      {/* Navigation bar */}
      <div className="flex items-center justify-between p-4 pt-12">
        <button
          onClick={onNavigateToSettings}
          className="text-blue-500 p-2"
          aria-label="Настройки"
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
        <button
          onClick={onNavigateToAdd}
          className="text-blue-500 p-2"
          aria-label="Добавить"
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
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>

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
                      .map((transaction) => {
                        let longPressTimer: number | null = null;
                        let touchStartX = 0;
                        let touchStartY = 0;

                        const handleTouchStart = (e: React.TouchEvent) => {
                          const touch = e.touches[0];
                          touchStartX = touch.clientX;
                          touchStartY = touch.clientY;
                          
                          longPressTimer = setTimeout(() => {
                            // Вибрация для обратной связи (как в iOS)
                            triggerHapticFeedback();
                            
                            // Показываем контекстное меню
                            setContextMenu({
                              x: touch.clientX,
                              y: touch.clientY,
                              transactionId: transaction.id,
                            });
                          }, 400); // 400ms для долгого нажатия
                        };

                        const handleTouchEnd = () => {
                          if (longPressTimer) {
                            clearTimeout(longPressTimer);
                            longPressTimer = null;
                          }
                        };

                        const handleTouchMove = (e: React.TouchEvent) => {
                          // Если палец сдвинулся слишком далеко, отменяем долгое нажатие
                          const touch = e.touches[0];
                          const deltaX = Math.abs(touch.clientX - touchStartX);
                          const deltaY = Math.abs(touch.clientY - touchStartY);
                          
                          if (deltaX > 10 || deltaY > 10) {
                            handleTouchEnd();
                          }
                        };

                        return (
                          <div
                            key={transaction.id}
                            className="px-2 py-1 flex justify-between"
                            style={{
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              touchAction: 'manipulation',
                              WebkitTouchCallout: 'none',
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                transactionId: transaction.id,
                              });
                            }}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                            onTouchMove={handleTouchMove}
                            onTouchCancel={handleTouchEnd}
                          >
                            <span>
                              {transaction.amount} {transactionFormatter.formatCategory(transaction.category)}
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Sync button */}
      {(hasUnsynchronized || isSyncing) && (
        <div className="fixed bottom-20 right-4 flex flex-col items-end gap-2">
          {syncError && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm max-w-xs">
              {syncError}
            </div>
          )}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center ${
              isSyncing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            {isSyncing ? (
              <svg
                className="w-6 h-6 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
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
            )}
          </button>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onTouchStart={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
          >
            <button
              onClick={() => {
                if (contextMenu.transactionId) {
                  onDeleteTransaction(contextMenu.transactionId);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
            >
              Удалить
            </button>
          </div>
        </>
      )}
    </div>
  );
}

