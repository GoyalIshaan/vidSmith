import React, { useState, useRef } from "react";
import { UploadService } from "../lib/uploadService";
import FileSelector from "../components/FileSelector";
import FileForm from "../components/FileForm";
import UploadProgress from "../components/UploadProgress";
import StatusMessage from "../components/StatusMessage";
import type { UploadProgress as UploadProgressType } from "../types/graphql";

const Upload: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressType | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>("");
  const uploadServiceRef = useRef<UploadService>(new UploadService());

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setVideoTitle(file.name.split(".").slice(0, -1).join("."));
    setError("");
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleTitleChange = (title: string) => {
    setVideoTitle(title);
  };

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

  return (
    <div className="w-full max-w-none">
      <h1 className="text-center text-gray-900 text-4xl font-semibold mb-8">
        Video Upload
      </h1>

      {!selectedFile && !isUploading && (
        <FileSelector
          onFileSelect={handleFileSelect}
          onError={handleError}
          disabled={isUploading}
        />
      )}

      {selectedFile && !isUploading && (
        <FileForm
          file={selectedFile}
          onRemoveFile={handleRemoveFile}
          onTitleChange={handleTitleChange}
          onSubmit={handleSubmitUpload}
          initialTitle={videoTitle}
        />
      )}

      {isUploading && (
        <UploadProgress
          progress={uploadProgress}
          status={uploadStatus}
          fileName={videoTitle || selectedFile?.name || ""}
          onAbort={handleAbort}
        />
      )}

      {uploadStatus && !isUploading && (
        <StatusMessage
          type="success"
          title="Upload Complete!"
          message={uploadStatus}
        />
      )}

      {error && (
        <StatusMessage type="error" title="Upload Failed" message={error} />
      )}
    </div>
  );
};

export default Upload;
