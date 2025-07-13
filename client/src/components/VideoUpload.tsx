import React, { useState, useRef, useCallback } from "react";
import { UploadService } from "../lib/uploadService";
import type { UploadProgress } from "../types/graphql";
import "./VideoUpload.css";

const VideoUpload: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
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
      handleFileUpload(videoFile);
    } else {
      setError("Please select a valid video file");
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith("video/")) {
        handleFileUpload(file);
      } else if (file) {
        setError("Please select a valid video file");
      }
    },
    []
  );

  const handleFileUpload = async (file: File) => {
    try {
      setError("");
      setUploadStatus("Initializing upload...");
      setIsUploading(true);
      setUploadProgress(null);

      const uploadService = uploadServiceRef.current;

      // Initiate the upload
      await uploadService.initiateUpload(file);
      setUploadStatus("Uploading video...");

      // Upload the file with progress tracking
      const result = await uploadService.uploadFile(file, (progress) => {
        setUploadProgress(progress);
      });

      setUploadStatus(`Upload completed! Video ID: ${result.videoDBID}`);
      setUploadProgress({
        uploadedParts: result.videoDBID ? 1 : 0,
        totalParts: 1,
        percentage: 100,
      });

      // Reset the service for next upload
      uploadService.reset();
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

  return (
    <div className="video-upload-container">
      <h1>Video Upload</h1>

      <div
        className={`upload-area ${isDragOver ? "drag-over" : ""} ${
          isUploading ? "uploading" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isUploading ? openFileDialog : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
          disabled={isUploading}
        />

        {!isUploading ? (
          <div className="upload-content">
            <div className="upload-icon">📹</div>
            <h3>Drop your video here</h3>
            <p>or click to browse</p>
            <p className="upload-hint">
              Supports MP4, MOV, AVI, and other video formats
            </p>
          </div>
        ) : (
          <div className="upload-progress">
            <div className="progress-info">
              <h3>Uploading Video...</h3>
              {uploadProgress && (
                <div className="progress-details">
                  <p>
                    Part {uploadProgress.currentPart} of{" "}
                    {uploadProgress.totalParts}
                  </p>
                  <p>{uploadProgress.uploadedParts} parts uploaded</p>
                </div>
              )}
            </div>

            {uploadProgress && (
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
                <span className="progress-text">
                  {uploadProgress.percentage}%
                </span>
              </div>
            )}

            <button
              className="abort-button"
              onClick={handleAbort}
              type="button"
            >
              Cancel Upload
            </button>
          </div>
        )}
      </div>

      {uploadStatus && (
        <div className="upload-status">
          <p>{uploadStatus}</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
