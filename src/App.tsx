import { useState } from 'react';
import type { View } from './types';
import { useTransactions } from './hooks/useTransactions';
import { AddTransactionView } from './components/AddTransactionView';
import { LogView } from './components/LogView';
import { SettingsView } from './components/SettingsView';
import { transactionFormatter } from './utils/transactionFormatter';
import { transactionStorage } from './utils/transactionStorage';

function App() {
  const [currentView, setCurrentView] = useState<View>('add');
  const { transactions, isLoading, addTransaction, deleteTransaction, hasUnsynchronizedTransactions } = useTransactions();

  const handleSync = () => {
    // В офлайн-версии синхронизация просто сохраняет текущий timestamp
    if (transactions.length > 0) {
      const maxTimestamp = Math.max(...transactions.map((t) => t.timestamp));
      transactionStorage.saveLastSyncTimestamp(maxTimestamp);
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
    <div className="h-screen bg-white">
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
        />
      )}
      {currentView === 'settings' && (
        <SettingsView
          onClose={() => setCurrentView('log')}
          onExport={handleExport}
        />
      )}
    </div>
  );
}

export default App;
