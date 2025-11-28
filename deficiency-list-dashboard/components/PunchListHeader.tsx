import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dateFormatter";
import Image from "next/image";

interface PunchListHeaderProps {
  lastUpdated?: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function PunchListHeader({ lastUpdated, onRefresh, isRefreshing }: PunchListHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-12 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-4">
            <Image
              src="/dec-logo.png"
              alt="DEC Logo"
              width={120}
              height={120}
              className="object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Deficiency List Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Punch List Management System
              </p>
            </div>
          </div>

          {/* Right: Last Updated and Refresh Button */}
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Last updated:</span>{" "}
                {formatDateTime(lastUpdated)}
              </div>
            )}
            <Button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

