import { useState, useEffect } from 'react';
import { transactionStorage } from '../utils/transactionStorage';
import { gistStorage } from '../utils/gistStorage';

interface SettingsViewProps {
  onClose: () => void;
  onExport: () => void;
  onClearAll: () => void;
}

export function SettingsView({ onClose, onExport, onClearAll }: SettingsViewProps) {
  const [monthlyAmount, setMonthlyAmount] = useState(120000);
  const [githubToken, setGithubToken] = useState('');
  const [gistUrl, setGistUrl] = useState<string | null>(null);

  useEffect(() => {
    setMonthlyAmount(transactionStorage.getMonthlyAmount());
    const token = gistStorage.getToken();
    setGithubToken(token || '');
    setGistUrl(gistStorage.getGistURL());
  }, []);

  const handleSave = () => {
    transactionStorage.saveMonthlyAmount(monthlyAmount);
    // Очищаем сохраненный дневной бюджет, чтобы он пересчитался
    localStorage.removeItem('daily_budget');
    localStorage.removeItem('daily_budget_date');
    localStorage.removeItem('last_monthly_amount_for_budget');
    
    // Сохраняем GitHub токен
    if (githubToken.trim()) {
      gistStorage.setToken(githubToken.trim());
    } else {
      gistStorage.clearToken();
    }
    
    onClose();
  };

  const handleClearToken = () => {
    setGithubToken('');
    gistStorage.clearToken();
    gistStorage.clearGistId();
    setGistUrl(null);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Navigation bar */}
      <div className="flex items-center justify-between p-4 pt-12">
        <button
          onClick={onClose}
          className="text-blue-500 font-medium px-2 py-1"
        >
          Отмена
        </button>
        <button
          onClick={handleSave}
          className="text-blue-500 font-medium px-2 py-1"
        >
          Сохранить
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-2xl font-bold mb-6">Настройки</h2>

        {/* Monthly budget */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Бюджет на месяц (RSD)</label>
          <input
            type="number"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg"
          />
        </div>

        {/* GitHub Token */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">GitHub Token</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-lg"
            />
            {githubToken && (
              <button
                onClick={handleClearToken}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Очистить
              </button>
            )}
          </div>
          {gistUrl && (
            <a
              href={gistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 mt-2 block"
            >
              Открыть Gist
            </a>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Токен для синхронизации с GitHub Gist. Создайте токен с правами gist на{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              github.com/settings/tokens
            </a>
          </p>
        </div>

        {/* Export button */}
        <div className="mb-6">
          <button
            onClick={onExport}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium"
          >
            Экспортировать лог
          </button>
        </div>

        {/* Clear all button */}
        <div className="mb-6">
          <button
            onClick={onClearAll}
            className="w-full py-3 bg-red-500 text-white rounded-lg font-medium"
          >
            Очистить весь лог
          </button>
        </div>
      </div>
    </div>
  );
}


