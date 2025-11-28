import { useState, useEffect } from 'react';
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
  'Здоровье',
  'Подарки',
  'Концерт',
  'Кофе',
  'Пиво',
  'Цветы',
  'Платежи',
  'Интернет',
  'Проезд',
  'Такси',
  'Стрижка',
  'Для дома',
  'Столовка',
  'Плеска',
  'Бункер',
  'Стендап',
  'Соко',
  'Руб',
  'Подписка',
  'Яндекс',
  'Спотифай',
  'Табак',
  'Настойки',
  'Уголь',
  'Настины',
  'Донаты',
  'Игрушки',
  'Бесплатный день',
];

export function AddTransactionView({
  transactions,
  onAddTransaction,
  onNavigateToLog,
}: AddTransactionViewProps) {
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableAmount, setAvailableAmount] = useState(0);

  useEffect(() => {
    const monthlyAmount = transactionStorage.getMonthlyAmount();
    const dailyBudget = budgetCalculator.calculateDailyBudget(monthlyAmount, transactions);
    const todaySpent = budgetCalculator.getTodaySpentAmount(transactions);
    setAvailableAmount(dailyBudget - todaySpent);
  }, [transactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && selectedCategory) {
      onAddTransaction(amount, selectedCategory);
      setAmount('');
      setSelectedCategory('');
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
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Available amount */}
        <div className="text-center mb-6">
          <div className={`text-3xl font-bold ${amountColor}`}>
            {Math.round(availableAmount)} RSD
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-sm font-medium mb-2">Сумма</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg"
              placeholder="Введите сумму"
              autoFocus
            />
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Категория</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 border rounded-lg text-sm ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!amount || !selectedCategory}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Добавить
          </button>
        </form>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={onNavigateToLog}
          className="w-full py-2 text-blue-500 font-medium"
        >
          Лог →
        </button>
      </div>
    </div>
  );
}

