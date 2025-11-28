"use client";

import { useEffect, useState, useCallback } from "react";
import { PunchListHeader } from "@/components/PunchListHeader";
import { PunchListTable } from "@/components/PunchListTable";
import { ErrorBanner } from "@/components/ErrorBanner";
import { fetchPunchListItems, refreshPunchListItems, ApiError } from "@/lib/api";
import { TPunchListItemRow } from "@/lib/schemas";
import { TooltipProvider } from "@/components/ui/tooltip";

const STORAGE_KEY = "punch-list-dashboard-last-good";

interface StoredData {
  rows: TPunchListItemRow[];
  lastUpdated?: string;
}

export default function Home() {
  const [rows, setRows] = useState<TPunchListItemRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage
  const loadFromStorage = useCallback((): StoredData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.error("Failed to load from localStorage:", err);
    }
    return null;
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((data: StoredData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }
  }, []);

  // Load punch list items data
  const loadItems = useCallback(async () => {
    try {
      const data = await fetchPunchListItems();
      setRows(data.rows);
      setLastUpdated(data.lastUpdated || new Date().toISOString());
      setError(null);
      
      // Save to localStorage
      saveToStorage({
        rows: data.rows,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      });
    } catch (err) {
      const apiError = err as ApiError;
      setError({
        status: apiError.status,
        message: apiError.message,
      });
      
      // Try to load from localStorage
      const stored = loadFromStorage();
      if (stored) {
        setRows(stored.rows);
        setLastUpdated(stored.lastUpdated);
      }
    }
  }, [saveToStorage, loadFromStorage]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      await refreshPunchListItems();
      await loadItems();
    } catch (err) {
      const apiError = err as ApiError;
      setError({
        status: apiError.status,
        message: apiError.message,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [loadItems]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      // First, try to load from localStorage to show something quickly
      const stored = loadFromStorage();
      if (stored) {
        setRows(stored.rows);
        setLastUpdated(stored.lastUpdated);
      }
      
      // Then fetch fresh data
      await loadItems();
      setIsLoading(false);
    };
    
    init();
  }, [loadItems, loadFromStorage]);

  if (isLoading && rows.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading Deficiency List Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        <PunchListHeader
          lastUpdated={lastUpdated}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        
        <main className="container mx-auto px-12 py-6 max-w-none">
          {error && <ErrorBanner error={error} />}
          <PunchListTable rows={rows} />
        </main>
      </div>
    </TooltipProvider>
  );
}
