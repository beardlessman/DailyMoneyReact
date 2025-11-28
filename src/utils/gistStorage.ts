import type { Transaction } from '../types';
import { transactionFormatter } from './transactionFormatter';

const GIST_FILE_NAME = 'DailyMoneyLog_DEV.csv';
const GIST_API_BASE = 'https://api.github.com/gists';

export enum GistStorageError {
  INVALID_TOKEN = 'INVALID_TOKEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  GIST_NOT_FOUND = 'GIST_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum SyncStatus {
  CONNECTED = 'CONNECTED',
  OFFLINE = 'OFFLINE',
  TOKEN_ERROR = 'TOKEN_ERROR',
  SYNCING = 'SYNCING',
}

interface GistFile {
  content: string;
}

interface GistCreateRequest {
  description: string;
  public: boolean;
  files: Record<string, GistFile>;
}

interface GistUpdateRequest {
  files: Record<string, GistFile>;
}

interface GistResponse {
  id: string;
  files: Record<string, { content?: string }>;
}

const TOKEN_KEY = 'github_token';
const GIST_ID_KEY = 'github_gist_id';

export const gistStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  hasToken(): boolean {
    return this.getToken() !== null;
  },

  getGistId(): string | null {
    return localStorage.getItem(GIST_ID_KEY);
  },

  setGistId(gistId: string): void {
    localStorage.setItem(GIST_ID_KEY, gistId);
  },

  clearGistId(): void {
    localStorage.removeItem(GIST_ID_KEY);
  },

  getGistURL(): string | null {
    const gistId = this.getGistId();
    return gistId ? `https://gist.github.com/${gistId}` : null;
  },

  // Инициализация Gist (создание нового, если нужно)
  async initializeIfNeeded(): Promise<void> {
    const token = this.getToken();
    if (!token) {
      throw new Error('GitHub token is not set');
    }

    const gistId = this.getGistId();
    if (gistId) {
      // Проверяем, существует ли Gist
      try {
        await this.fetchGistContent(gistId, token);
        return; // Gist существует
      } catch (error) {
        if (error === GistStorageError.GIST_NOT_FOUND) {
          // Gist не найден, создаем новый
          this.clearGistId();
        } else {
          throw error;
        }
      }
    }

    // Создаем новый Gist
    await this.createNewGist(token);
  },

  // Создание нового Gist
  async createNewGist(token: string): Promise<void> {
    const url = GIST_API_BASE;
    const request: GistCreateRequest = {
      description: 'DailyMoney Log (DEV)',
      public: false,
      files: {
        [GIST_FILE_NAME]: {
          content: 'timestamp,amount,comment\n',
        },
      },
    };

    console.log('Creating new Gist...');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(request),
      });

      console.log('Create Gist response status:', response.status);

      if (response.status === 401) {
        console.error('Invalid token');
        throw GistStorageError.INVALID_TOKEN;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create Gist:', response.status, errorText);
        throw GistStorageError.NETWORK_ERROR;
      }

      const data: GistResponse = await response.json();
      console.log('Gist created with ID:', data.id);
      this.setGistId(data.id);
    } catch (error) {
      console.error('Error creating Gist:', error);
      if (error === GistStorageError.INVALID_TOKEN || error === GistStorageError.NETWORK_ERROR) {
        throw error;
      }
      throw GistStorageError.NETWORK_ERROR;
    }
  },

  // Загрузка содержимого Gist
  async fetchGistContent(gistId: string, token: string): Promise<string> {
    const url = `${GIST_API_BASE}/${gistId}`;
    console.log('Fetching Gist content:', gistId);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      console.log('Fetch Gist response status:', response.status);

      if (response.status === 401) {
        console.error('Invalid token');
        throw GistStorageError.INVALID_TOKEN;
      }

      if (response.status === 404) {
        console.error('Gist not found');
        throw GistStorageError.GIST_NOT_FOUND;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch Gist:', response.status, errorText);
        throw GistStorageError.NETWORK_ERROR;
      }

      const data: GistResponse = await response.json();
      console.log('Gist files:', Object.keys(data.files || {}));
      
      const file = data.files[GIST_FILE_NAME];
      
      if (!file || !file.content) {
        console.warn('File not found in Gist, returning empty content');
        // Файл не существует в Gist, возвращаем пустой контент
        return 'timestamp,amount,comment\n';
      }

      console.log('Gist content loaded, length:', file.content.length);
      return file.content;
    } catch (error) {
      console.error('Error fetching Gist content:', error);
      if (error === GistStorageError.INVALID_TOKEN || 
          error === GistStorageError.GIST_NOT_FOUND || 
          error === GistStorageError.NETWORK_ERROR) {
        throw error;
      }
      throw GistStorageError.NETWORK_ERROR;
    }
  },

  // Обновление Gist
  async updateGist(gistId: string, token: string, content: string): Promise<void> {
    const url = `${GIST_API_BASE}/${gistId}`;
    const request: GistUpdateRequest = {
      files: {
        [GIST_FILE_NAME]: {
          content,
        },
      },
    };

    console.log('Updating Gist:', gistId, 'content length:', content.length);

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(request),
      });

      console.log('Update Gist response status:', response.status);

      if (response.status === 401) {
        console.error('Invalid token');
        throw GistStorageError.INVALID_TOKEN;
      }

      if (response.status === 404) {
        console.error('Gist not found');
        throw GistStorageError.GIST_NOT_FOUND;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update Gist:', response.status, errorText);
        throw GistStorageError.NETWORK_ERROR;
      }

      console.log('Gist updated successfully');
    } catch (error) {
      console.error('Error updating Gist:', error);
      if (error === GistStorageError.INVALID_TOKEN || 
          error === GistStorageError.GIST_NOT_FOUND || 
          error === GistStorageError.NETWORK_ERROR) {
        throw error;
      }
      throw GistStorageError.NETWORK_ERROR;
    }
  },

  // Загрузка транзакций из Gist
  async loadLog(): Promise<Transaction[]> {
    const gistId = this.getGistId();
    const token = this.getToken();

    if (!gistId || !token) {
      console.log('No gistId or token, returning empty array');
      return [];
    }

    try {
      console.log('Loading log from Gist, gistId:', gistId);
      const content = await this.fetchGistContent(gistId, token);
      console.log('Fetched content length:', content.length);
      const transactions = this.parseCSV(content);
      console.log('Parsed transactions count:', transactions.length);
      return transactions;
    } catch (error) {
      console.error('Error loading log from Gist:', error);
      throw error;
    }
  },

  // Синхронизация с Gist
  async syncWithGist(localTransactions: Transaction[]): Promise<Transaction[]> {
    const gistId = this.getGistId();
    const token = this.getToken();

    console.log('syncWithGist called, gistId:', gistId, 'hasToken:', !!token);
    console.log('Local transactions count:', localTransactions.length);

    if (!gistId || !token) {
      console.error('GitHub token or Gist ID is not set');
      throw new Error('GitHub token or Gist ID is not set');
    }

    try {
      console.log('Loading log from Gist...');
      // Загружаем транзакции из Gist
      const gistTransactions = await this.loadLog();
      console.log('Loaded transactions from Gist:', gistTransactions.length);

      // Создаем Map для быстрого поиска по timestamp (ключ - roundedTimestamp)
      const transactionMap = new Map<number, Transaction>();

      console.log('Starting merge...');
      console.log('Gist transactions:', gistTransactions.map(t => ({ 
        timestamp: t.timestamp, 
        rounded: Math.round(t.timestamp),
        amount: t.amount,
        category: t.category 
      })));

      // Сначала добавляем все транзакции из Gist
      for (const transaction of gistTransactions) {
        const roundedTimestamp = Math.round(transaction.timestamp);
        // Если уже есть транзакция с таким timestamp, оставляем ту, что из Gist (более свежая версия)
        if (!transactionMap.has(roundedTimestamp)) {
          transactionMap.set(roundedTimestamp, transaction);
          console.log('Added Gist transaction:', roundedTimestamp, transaction.amount, transaction.category);
        } else {
          console.log('Skipped duplicate Gist transaction:', roundedTimestamp);
        }
      }

      console.log('Gist transactions in map:', transactionMap.size);
      console.log('Local transactions:', localTransactions.map(t => ({ 
        timestamp: t.timestamp, 
        rounded: Math.round(t.timestamp),
        amount: t.amount,
        category: t.category 
      })));

      // Затем добавляем локальные транзакции, которых нет в Gist
      for (const localTransaction of localTransactions) {
        const roundedTimestamp = Math.round(localTransaction.timestamp);
        // Добавляем только если такой транзакции еще нет
        if (!transactionMap.has(roundedTimestamp)) {
          transactionMap.set(roundedTimestamp, localTransaction);
          console.log('Added local transaction:', roundedTimestamp, localTransaction.amount, localTransaction.category);
        } else {
          console.log('Skipped duplicate local transaction (exists in Gist):', roundedTimestamp);
        }
      }

      // Преобразуем Map обратно в массив
      const finalTransactions = Array.from(transactionMap.values());

      // Сортируем по дате (новые первыми)
      finalTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      console.log('Final merged transactions count:', finalTransactions.length);
      console.log('Gist transactions preserved:', gistTransactions.length);
      console.log('Local transactions added:', finalTransactions.length - gistTransactions.length);
      console.log('Final transactions:', finalTransactions.map(t => ({ 
        timestamp: t.timestamp, 
        rounded: Math.round(t.timestamp),
        amount: t.amount,
        category: t.category 
      })));
      
      // Сохраняем в Gist
      console.log('Saving to Gist...');
      await this.overwriteLog(finalTransactions);
      console.log('Saved to Gist successfully');

      return finalTransactions;
    } catch (error) {
      console.error('Error syncing with Gist:', error);
      if (error === GistStorageError.INVALID_TOKEN || 
          error === GistStorageError.NETWORK_ERROR || 
          error === GistStorageError.GIST_NOT_FOUND) {
        throw error;
      }
      throw new Error(`Ошибка синхронизации: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // Перезапись лога в Gist
  async overwriteLog(transactions: Transaction[]): Promise<void> {
    const gistId = this.getGistId();
    const token = this.getToken();

    if (!gistId || !token) {
      throw new Error('GitHub token or Gist ID is not set');
    }

    const content = this.formatCSV(transactions);
    await this.updateGist(gistId, token, content);
  },

  // Форматирование транзакций в CSV
  formatCSV(transactions: Transaction[]): string {
    console.log('formatCSV called with', transactions.length, 'transactions');
    
    // Убираем дубликаты перед форматированием
    const uniqueTransactions: Transaction[] = [];
    const seenTimestamps = new Set<number>();
    for (const transaction of transactions) {
      const roundedTimestamp = Math.round(transaction.timestamp);
      if (!seenTimestamps.has(roundedTimestamp)) {
        uniqueTransactions.push(transaction);
        seenTimestamps.add(roundedTimestamp);
        console.log('Added to unique:', roundedTimestamp, transaction.amount, transaction.category);
      } else {
        console.log('Skipped duplicate in formatCSV:', roundedTimestamp);
      }
    }

    console.log('Unique transactions count:', uniqueTransactions.length);

    // Сортируем по timestamp (от новых к старым)
    const sorted = uniqueTransactions.sort((a, b) => b.timestamp - a.timestamp);

    let result = 'timestamp,amount,comment\n';

    for (const transaction of sorted) {
      const timestampDate = new Date(transaction.timestamp * 1000);
      // Используем формат без дробных секунд: 2025-11-27T19:13:24Z (как в iOS)
      const timestampISO = timestampDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
      
      // Используем formattedCategory для добавления суффиксов " еда" и " алко"
      const comment = transaction.category === 'бесплатный день' 
        ? 'бесплатный день' 
        : transactionFormatter.formatCategory(transaction.category);
      
      // Экранируем кавычки в комментарии (заменяем " на "")
      const escapedComment = comment.replace(/"/g, '""');
      
      // Всегда экранируем комментарий в кавычках
      result += `${timestampISO},${transaction.amount},"${escapedComment}"\n`;
      console.log('Added to CSV:', timestampISO, transaction.amount, comment);
    }

    console.log('Formatted CSV length:', result.length);
    console.log('Formatted CSV lines:', result.split('\n').length);
    return result;
  },

  // Парсинг CSV
  parseCSV(content: string): Transaction[] {
    console.log('Parsing CSV, content length:', content.length);
    console.log('CSV content:', content);
    
    const lines = content.split('\n');
    const transactions: Transaction[] = [];
    const seenTimestamps = new Set<number>();

    // Пропускаем заголовок
    if (lines.length <= 1) {
      console.log('No data lines in CSV');
      return [];
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        continue;
      }

      console.log('Parsing line:', line);

      // Парсим CSV строку: timestamp,amount,comment
      // Обрабатываем кавычки в комментариях (как в iOS версии)
      const components: string[] = [];
      let currentComponent = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          // Если следующая кавычка тоже ", то это экранированная кавычка ""
          if (j + 1 < line.length && line[j + 1] === '"') {
            currentComponent += '"';
            j++; // Пропускаем следующую кавычку
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          components.push(currentComponent);
          currentComponent = '';
        } else {
          currentComponent += char;
        }
      }
      components.push(currentComponent); // Последний компонент

      console.log('Parsed components:', components);

      if (components.length < 3) {
        console.warn('Invalid CSV line, not enough components:', components);
        continue;
      }

      let [timestampStr, amount, comment] = components;

      // Убираем кавычки из комментария, если есть (как в iOS версии)
      comment = comment.trim();
      if (comment.startsWith('"') && comment.endsWith('"')) {
        comment = comment.slice(1, -1);
      }

      // Парсим timestamp из ISO формата
      const timestampDate = new Date(timestampStr.trim());
      if (isNaN(timestampDate.getTime())) {
        console.warn('Invalid timestamp:', timestampStr);
        continue;
      }

      const timestamp = timestampDate.getTime() / 1000;
      const roundedTimestamp = Math.round(timestamp);

      // Пропускаем дубликаты
      if (seenTimestamps.has(roundedTimestamp)) {
        console.log('Duplicate timestamp skipped:', roundedTimestamp);
        continue;
      }
      seenTimestamps.add(roundedTimestamp);

      // Убираем суффиксы из категории (если есть)
      let category = comment;
      if (category.endsWith(' еда')) {
        category = category.slice(0, -4);
      } else if (category.endsWith(' алко')) {
        category = category.slice(0, -5);
      }

      const transaction: Transaction = {
        id: timestampDate.toISOString(),
        amount: amount.trim(),
        category,
        date: timestampDate,
        timestamp: roundedTimestamp,
      };

      console.log('Parsed transaction:', transaction);
      transactions.push(transaction);
    }

    console.log('Total parsed transactions:', transactions.length);
    return transactions;
  },
};

