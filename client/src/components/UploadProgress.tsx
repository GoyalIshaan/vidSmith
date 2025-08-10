import React from "react";
import type { UploadProgress as UploadProgressType } from "../types/graphql";

interface UploadProgressProps {
  progress: UploadProgressType | null;
  status: string;
  fileName: string;
  onAbort: () => void;
}

const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  status,
  fileName,
  onAbort,
}) => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        {/* Upload Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-pulse">🚀</div>
          <h3 className="text-gray-900 text-3xl font-bold mb-2">
            Uploading Your Video
          </h3>
          <p className="text-gray-600 text-lg">{fileName}</p>
        </div>

        {/* Upload Stats */}
        {progress && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {progress.currentPart || 1}
                </p>
                <p className="text-sm text-gray-600">Current Part</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {progress.totalParts || 1}
                </p>
                <p className="text-sm text-gray-600">Total Parts</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {progress && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-900 font-semibold">Progress</span>
              <span className="text-gray-900 font-bold text-lg">
                {progress.percentage}%
              </span>
            </div>
            <div className="relative bg-gray-200 border border-gray-300 rounded-full h-6 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                style={{ width: `${progress.percentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-900 text-sm font-bold drop-shadow-sm">
                  {progress.percentage}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Status Message */}
        {status && (
          <div className="text-center mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 font-medium">{status}</p>
          </div>
        )}

        {/* Cancel Button */}
        <div className="text-center">
          <button
            className="bg-red-500 hover:bg-red-600 text-white py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl border-2 border-transparent hover:border-red-500"
            onClick={onAbort}
            type="button"
          >
            ❌ Cancel Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadProgress;
