import React, { useState, useRef, useCallback } from "react";
import { UploadService } from "../lib/uploadService";
import type { UploadProgress } from "../types/graphql";

const VideoUpload: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadServiceRef = useRef<UploadService>(new UploadService());

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((file) => file.type.startsWith("video/"));

    if (videoFile) {
      // Additional validation for video files
      if (videoFile.size < 1024) {
        setError("Video file is too small or corrupted");
        return;
      }
      
      // Check for common video formats
      const validFormats = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/mkv'];
      if (!validFormats.includes(videoFile.type)) {
        console.warn(`Video format ${videoFile.type} may not be fully compatible with ffmpeg processing`);
      }
      
      setSelectedFile(videoFile);
      setVideoTitle(videoFile.name.split(".").slice(0, -1).join("."));
      setError("");
    } else {
      setError("Please select a valid video file");
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith("video/")) {
        // Additional validation for video files
        if (file.size < 1024) {
          setError("Video file is too small or corrupted");
          return;
        }

        // Check for common video formats
        const validFormats = [
          "video/mp4",
          "video/mov",
          "video/avi",
          "video/webm",
          "video/mkv",
        ];
        if (!validFormats.includes(file.type)) {
          console.warn(
            `Video format ${file.type} may not be fully compatible with ffmpeg processing`
          );
        }

        setSelectedFile(file);
        setVideoTitle(file.name.split(".").slice(0, -1).join("."));
        setError("");
      } else if (file) {
        setError("Please select a valid video file");
      }
    },
    []
  );

  const handleSubmitUpload = async () => {
    if (!selectedFile) {
      setError("Please select a video file first");
      return;
    }

    if (!videoTitle.trim()) {
      setError("Please enter a video title");
      return;
    }

    try {
      setError("");
      setUploadStatus("Validating video file...");
      setIsUploading(true);
      setUploadProgress(null);

      const uploadService = uploadServiceRef.current;

      // Initiate the upload with the custom video title
      setUploadStatus("Preparing video for upload...");
      await uploadService.initiateUpload(selectedFile, videoTitle.trim());
      setUploadStatus("Uploading video...");

      // Upload the file with progress tracking
      const result = await uploadService.uploadFile(
        selectedFile,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      setUploadStatus(`Upload completed! Video: ${videoTitle}`);
      setUploadProgress({
        uploadedParts: result.videoDBID ? 1 : 0,
        totalParts: 1,
        percentage: 100,
      });

      // Reset everything for next upload
      uploadService.reset();
      setSelectedFile(null);
      setVideoTitle("");
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadStatus("");

      // Try to abort the upload if it was initiated
      try {
        await uploadServiceRef.current.abortUpload();
      } catch (abortError) {
        console.error("Failed to abort upload:", abortError);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setVideoTitle("");
    setError("");
  };

  const handleAbort = async () => {
    try {
      await uploadServiceRef.current.abortUpload();
      setUploadStatus("Upload aborted");
      setUploadProgress(null);
      setIsUploading(false);
      setError("");
    } catch {
      setError("Failed to abort upload");
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getUploadAreaClasses = () => {
    let classes =
      "border-3 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 bg-white min-h-[300px] flex items-center justify-center relative overflow-hidden ";

    if (isDragOver) {
      classes += "border-red-500 scale-105 shadow-red-200 shadow-xl ";
    } else if (isUploading) {
      classes += "border-red-500 cursor-default ";
    } else {
      classes +=
        "border-black hover:border-red-500 hover:-translate-y-1 hover:shadow-red-200 hover:shadow-lg ";
    }

    return classes;
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-center text-black text-4xl font-semibold mb-8">
        Video Upload
      </h1>

      {!selectedFile && !isUploading && (
        <div
          className={getUploadAreaClasses()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            disabled={isUploading}
          />

          <div className="flex flex-col items-center gap-4">
            <div className="text-6xl animate-bounce">📹</div>
            <h3 className="text-black text-2xl font-semibold">
              Drop your video here
            </h3>
            <p className="text-black text-lg">or click to browse</p>
            <p className="text-black text-sm italic">
              Supports MP4, MOV, AVI, and other video formats
            </p>
          </div>
        </div>
      )}

      {selectedFile && !isUploading && (
        <div className="bg-white border border-black rounded-xl p-8">
          <h3 className="text-black text-xl font-semibold mb-6">
            Ready to Upload
          </h3>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-black font-medium">Selected File:</p>
                <p className="text-gray-600 text-sm">{selectedFile.name}</p>
                <p className="text-gray-500 text-xs">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={handleRemoveFile}
                className="text-red-500 hover:text-red-700 font-medium text-sm"
              >
                Remove
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="videoTitle"
              className="block text-black font-semibold mb-2"
            >
              Video Title:
            </label>
            <input
              id="videoTitle"
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Enter a title for your video"
              className="w-full px-4 py-3 border border-black rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              maxLength={100}
            />
            <p className="text-gray-500 text-xs mt-1">
              {videoTitle.length}/100 characters
            </p>
          </div>

          <button
            onClick={handleSubmitUpload}
            disabled={!videoTitle.trim()}
            className={`w-full py-4 px-6 rounded-lg text-lg font-semibold transition-all duration-300 ${
              videoTitle.trim()
                ? "bg-red-500 hover:bg-black text-white transform hover:-translate-y-0.5 shadow-lg"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            🚀 Upload Video
          </button>
        </div>
      )}

      {isUploading && (
        <div className="bg-white border border-black rounded-xl p-8 max-w-2xl mx-auto">
          {/* Upload Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-pulse">🚀</div>
            <h3 className="text-black text-3xl font-bold mb-2">
              Uploading Your Video
            </h3>
            <p className="text-gray-600 text-lg">
              {videoTitle || selectedFile?.name}
            </p>
          </div>

          {/* Upload Stats */}
          {uploadProgress && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-black">
                    {uploadProgress.currentPart || 1}
                  </p>
                  <p className="text-sm text-gray-600">Current Part</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-black">
                    {uploadProgress.totalParts || 1}
                  </p>
                  <p className="text-sm text-gray-600">Total Parts</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {uploadProgress && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-black font-semibold">Progress</span>
                <span className="text-black font-bold text-lg">
                  {uploadProgress.percentage}%
                </span>
              </div>
              <div className="relative bg-gray-200 border border-black rounded-full h-6 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${uploadProgress.percentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-black text-sm font-bold drop-shadow-sm">
                    {uploadProgress.percentage}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Status Message */}
          {uploadStatus && (
            <div className="text-center mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 font-medium">{uploadStatus}</p>
            </div>
          )}

          {/* Cancel Button */}
          <div className="text-center">
            <button
              className="bg-red-500 hover:bg-black text-white py-3 px-8 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-xl border-2 border-transparent hover:border-red-500"
              onClick={handleAbort}
              type="button"
            >
              ❌ Cancel Upload
            </button>
          </div>
        </div>
      )}

      {uploadStatus && !isUploading && (
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl text-center shadow-lg">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-green-800 text-xl font-bold mb-2">
              Upload Complete!
            </h3>
            <p className="text-green-700 font-medium">{uploadStatus}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-8 max-w-2xl mx-auto">
          <div className="p-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-500 rounded-xl text-center shadow-lg">
            <div className="text-4xl mb-3">❌</div>
            <h3 className="text-red-800 text-xl font-bold mb-2">
              Upload Failed
            </h3>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
