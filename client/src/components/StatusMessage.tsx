import React from "react";

interface StatusMessageProps {
  type: "success" | "error";
  title: string;
  message: string;
}

const StatusMessage: React.FC<StatusMessageProps> = ({
  type,
  title,
  message,
}) => {
  const isSuccess = type === "success";

  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <div
        className={`p-6 ${
          isSuccess
            ? "bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500"
            : "bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-500"
        } rounded-xl text-center shadow-lg`}
      >
        <div className="text-4xl mb-3">{isSuccess ? "✅" : "❌"}</div>
        <h3
          className={`${
            isSuccess ? "text-green-800" : "text-red-800"
          } text-xl font-bold mb-2`}
        >
          {title}
        </h3>
        <p
          className={`${
            isSuccess ? "text-green-700" : "text-red-700"
          } font-medium`}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

export default StatusMessage;
