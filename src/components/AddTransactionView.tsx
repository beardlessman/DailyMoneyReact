import { useState, useEffect, useRef } from 'react';
import type { Transaction } from '../types';
import { budgetCalculator } from '../utils/budgetCalculator';
import { transactionStorage } from '../utils/transactionStorage';

interface AddTransactionViewProps {
  transactions: Transaction[];
  onAddTransaction: (amount: string, category: string) => void;
  onNavigateToLog: () => void;
}

const categories = [
  'Продукты',
  'Доставка',
  'Алкоголь',
  'Кальян',
  'Транспорт',
  'Платежи',
  'Для дома',
  'Здоровье',
  'Кофе',
];

export function AddTransactionView({
  transactions,
  onAddTransaction,
  onNavigateToLog,
}: AddTransactionViewProps) {
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Продукты');
  const [availableAmount, setAvailableAmount] = useState(0);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string }>>([]);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const hasFocusedRef = useRef(false);

  useEffect(() => {
    const monthlyAmount = transactionStorage.getMonthlyAmount();
    const dailyBudget = budgetCalculator.calculateDailyBudget(monthlyAmount, transactions);
    const todaySpent = budgetCalculator.getTodaySpentAmount(transactions);
    setAvailableAmount(dailyBudget - todaySpent);
  }, [transactions]);

  useEffect(() => {
    const focusInput = () => {
      if (amountInputRef.current && !hasFocusedRef.current) {
        try {
          amountInputRef.current.focus();
          hasFocusedRef.current = true;
        } catch (e) {
          // Игнорируем ошибки фокуса
        }
      }
    };

    focusInput();
    const timer1 = setTimeout(focusInput, 300);
    const timer2 = setTimeout(focusInput, 800);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !hasFocusedRef.current) {
        setTimeout(focusInput, 100);
      }
    });

    window.addEventListener('pageshow', (e: PageTransitionEvent) => {
      if (e.persisted && !hasFocusedRef.current) {
        setTimeout(() => {
          if (amountInputRef.current) {
            amountInputRef.current.focus();
            hasFocusedRef.current = true;
          }
        }, 200);
      }
    });

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleFirstTouch = (e: React.TouchEvent) => {
    if (!hasFocusedRef.current && amountInputRef.current) {
      const target = e.target as HTMLElement;
      const isButton = target.closest('button');
      const isInput = target.closest('input');
      
      if (!isButton && !isInput) {
        try {
          amountInputRef.current.focus();
          hasFocusedRef.current = true;
        } catch (e) {
          requestAnimationFrame(() => {
            if (amountInputRef.current && !hasFocusedRef.current) {
              amountInputRef.current.focus();
              hasFocusedRef.current = true;
            }
          });
        }
      }
    }
  };

  const handleAddClick = () => {
    const amountValue = amount.trim();
    if (!amountValue) {
      return;
    }

    // Если категория не выбрана, подставляем "что-то" (как в iOS)
    const categoryText = selectedCategory.trim() || 'что-то';
    
    try {
      onAddTransaction(amountValue, categoryText);
      
      // Показываем тост
      const toastId = Date.now().toString();
      setToasts((prev) => [...prev, { id: toastId, message: `${amountValue} ${categoryText}` }]);
      
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 3000);
      
      // Очищаем форму
      setAmount('');
      setSelectedCategory('Продукты');
      
      // Возвращаем фокус на поле суммы после отправки
      setTimeout(() => {
        if (amountInputRef.current) {
          amountInputRef.current.focus();
          hasFocusedRef.current = true;
        }
      }, 100);
    } catch (error) {
      console.error('Error in handleAddClick:', error);
      alert('Ошибка при добавлении транзакции: ' + error);
    }
  };

  const monthlyAmount = transactionStorage.getMonthlyAmount();
  const dailyBudget = budgetCalculator.calculateDailyBudget(monthlyAmount, transactions);
  const amountColor =
    availableAmount > dailyBudget * 0.5
      ? 'text-green-600'
      : availableAmount < 0
      ? 'text-red-600'
      : 'text-black';

  return (
    <div className="flex flex-col h-screen bg-white" onTouchStart={handleFirstTouch}>
      {/* Navigation bar */}
      <div className="flex items-center justify-start p-4 pt-12">
        <button
          onClick={onNavigateToLog}
          className="text-blue-500 p-2"
          aria-label="Лог"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <circle cx="3" cy="6" r="1.5" fill="currentColor" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13" />
            <circle cx="3" cy="12" r="1.5" fill="currentColor" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h13" />
            <circle cx="3" cy="18" r="1.5" fill="currentColor" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 18h13" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pt-6">
        <div className="flex flex-col items-center px-8 space-y-6">
          {/* Available amount */}
          <button
            type="button"
            className={`text-[30px] font-bold ${amountColor} text-center pb-2`}
          >
            {Math.round(availableAmount)} RSD
          </button>

          {/* Amount input */}
          <div className="relative w-full">
            <div className="relative">
              <input
                ref={amountInputRef}
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-4 bg-gray-100 rounded-xl text-[28px] text-center focus:outline-none"
                placeholder="Сумма"
                onTouchStart={(e) => {
                  e.currentTarget.focus();
                  hasFocusedRef.current = true;
                }}
                onClick={() => {
                  if (amountInputRef.current) {
                    amountInputRef.current.focus();
                    hasFocusedRef.current = true;
                  }
                }}
              />
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category suggestions - horizontal scroll */}
          <div className="w-full overflow-x-auto">
            <div className="flex space-x-3 px-8">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-base whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Category input */}
          <div className="relative w-full">
            <div className="relative">
              <input
                ref={categoryInputRef}
                type="text"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-4 bg-gray-100 rounded-xl text-xl text-left focus:outline-none"
                placeholder="Категория"
              />
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleAddClick}
            className={`w-full py-4 rounded-xl text-lg font-semibold ${
              amount && amount.trim()
                ? 'bg-blue-500 text-white active:bg-blue-600'
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            Добавить
          </button>

          <div className="flex-1" />
        </div>
      </div>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="absolute top-16 left-0 right-0 flex flex-col items-center space-y-2 px-4 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-white px-5 py-3 rounded-lg shadow-lg text-base font-medium text-gray-900"
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
