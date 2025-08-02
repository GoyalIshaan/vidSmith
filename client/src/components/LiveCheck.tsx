import { useState, useEffect } from "react";

interface LiveStatus {
  isLive: boolean;
  loading: boolean;
  error?: string;
}

const LiveCheck = () => {
  const [status, setStatus] = useState<LiveStatus>({
    isLive: false,
    loading: true,
  });

  const checkLiveStatus = async () => {
    try {
      setStatus({ isLive: false, loading: true });

      const response = await fetch("https://api.vidsmith.org/live", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setStatus({ isLive: true, loading: false });
      } else {
        setStatus({
          isLive: false,
          loading: false,
          error: `HTTP ${response.status}`,
        });
      }
    } catch (error) {
      setStatus({
        isLive: false,
        loading: false,
        error: error instanceof Error ? error.message : "Network error",
      });
    }
  };

  useEffect(() => {
    checkLiveStatus();

    // Check status every 30 seconds
    const interval = setInterval(checkLiveStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (status.loading) return "bg-yellow-500";
    if (status.isLive) return "bg-green-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (status.loading) return "Checking...";
    if (status.isLive) return "Live";
    return "Offline";
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}
        ></div>
        <span className="text-sm font-medium">Service: {getStatusText()}</span>
      </div>
      {status.error && (
        <span className="text-xs text-red-600">({status.error})</span>
      )}
      <button
        onClick={checkLiveStatus}
        disabled={status.loading}
        className="ml-2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
      >
        Refresh
      </button>
    </div>
  );
};

export default LiveCheck;
