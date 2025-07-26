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
      setUploadStatus("Initializing upload...");
      setIsUploading(true);
      setUploadProgress(null);

      const uploadService = uploadServiceRef.current;

      // Initiate the upload with the custom video title
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
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h3 className="text-black text-2xl font-semibold mb-4">
              Uploading Video...
            </h3>
            {uploadProgress && (
              <div className="flex justify-between text-sm mb-4">
                <p className="text-black">
                  Part {uploadProgress.currentPart} of{" "}
                  {uploadProgress.totalParts}
                </p>
                <p className="text-black">
                  {uploadProgress.uploadedParts} parts uploaded
                </p>
              </div>
            )}
          </div>

          {uploadProgress && (
            <div className="relative bg-white border border-black rounded-full h-5 overflow-hidden mb-6 shadow-inner">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${uploadProgress.percentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              </div>
              <span className="absolute inset-0 flex items-center justify-center text-black text-sm font-semibold">
                {uploadProgress.percentage}%
              </span>
            </div>
          )}

          <button
            className="w-full bg-red-500 hover:bg-black text-white py-3 px-6 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg"
            onClick={handleAbort}
            type="button"
          >
            Cancel Upload
          </button>
        </div>
      )}

      {uploadStatus && (
        <div className="mt-6 p-4 bg-green-100 border border-green-500 rounded-lg text-center">
          <p className="text-green-700 font-medium">{uploadStatus}</p>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-white border border-red-500 rounded-lg text-center">
          <p className="text-red-500 font-medium">❌ {error}</p>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
