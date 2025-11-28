import { AlertCircle } from "lucide-react";

interface ErrorBannerProps {
  error: {
    status?: number;
    message: string;
  };
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-red-900">
          {error.status ? `Error ${error.status}` : "Error"}
        </h3>
        <p className="text-sm text-red-700 mt-1">{error.message}</p>
        <p className="text-xs text-red-600 mt-2">
          Showing last successfully loaded data. Actions and notes may still be available.
        </p>
      </div>
    </div>
  );
}

