'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              시스템 오류
            </h2>
            <p className="text-gray-600 mb-4">
              심각한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
            </p>
            <button
              onClick={reset}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}