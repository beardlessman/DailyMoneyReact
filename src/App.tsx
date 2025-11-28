import { useState } from 'react';
import type { View } from './types';
import { useTransactions } from './hooks/useTransactions';
import { AddTransactionView } from './components/AddTransactionView';
import { LogView } from './components/LogView';
import { SettingsView } from './components/SettingsView';
import { transactionFormatter } from './utils/transactionFormatter';
import { transactionStorage } from './utils/transactionStorage';
import { gistStorage, GistStorageError } from './utils/gistStorage';

function App() {
  const [currentView, setCurrentView] = useState<View>('add');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { transactions, isLoading, addTransaction, deleteTransaction, hasUnsynchronizedTransactions, clearAllTransactions, loadTransactions } = useTransactions();

  const handleSync = async () => {
    console.log('Sync started');
    
    if (!gistStorage.hasToken()) {
      console.error('No token');
      setSyncError('GitHub токен не установлен. Установите токен в настройках.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log('Initializing Gist...');
      // Инициализируем Gist, если нужно
      await gistStorage.initializeIfNeeded();
      console.log('Gist initialized');

      console.log('Syncing transactions, local count:', transactions.length);
      // Синхронизируем локальные транзакции с Gist
      const syncedTransactions = await gistStorage.syncWithGist(transactions);
      console.log('Sync completed, synced count:', syncedTransactions.length);

      // Сохраняем максимальный timestamp из синхронизированных транзакций
      if (syncedTransactions.length > 0) {
        const maxTimestamp = Math.max(...syncedTransactions.map((t) => t.timestamp));
        transactionStorage.saveLastSyncTimestamp(maxTimestamp);
      }

      // Обновляем локальные транзакции
      transactionStorage.saveTransactions(syncedTransactions);
      loadTransactions();
      console.log('Sync successful');
    } catch (error) {
      console.error('Sync error:', error);
      let errorMessage = 'Ошибка синхронизации';
      if (error === GistStorageError.INVALID_TOKEN) {
        errorMessage = 'Неверный токен GitHub. Проверьте токен в настройках.';
      } else if (error === GistStorageError.NETWORK_ERROR) {
        errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
      } else if (error === GistStorageError.GIST_NOT_FOUND) {
        errorMessage = 'Gist не найден. Будет создан новый.';
      } else if (error instanceof Error) {
        errorMessage = `${error.message} (проверьте консоль для деталей)`;
      }
      setSyncError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    const logText = transactionFormatter.formatTransactions(transactions);
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DailyMoneyLog_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white select-none">
      {currentView === 'add' && (
        <AddTransactionView
          transactions={transactions}
          onAddTransaction={addTransaction}
          onNavigateToLog={() => setCurrentView('log')}
        />
      )}
      {currentView === 'log' && (
        <LogView
          transactions={transactions}
          onDeleteTransaction={deleteTransaction}
          onNavigateToAdd={() => setCurrentView('add')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onSync={handleSync}
          hasUnsynchronized={hasUnsynchronizedTransactions()}
          isSyncing={isSyncing}
          syncError={syncError}
        />
      )}
      {currentView === 'settings' && (
        <SettingsView
          onClose={() => setCurrentView('log')}
          onExport={handleExport}
          onClearAll={async () => {
            if (confirm('Вы уверены, что хотите удалить все транзакции? Это действие нельзя отменить.')) {
              // Очищаем только локальные транзакции
              // Gist не трогаем - при следующей синхронизации данные из Gist вернутся
              clearAllTransactions();
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
