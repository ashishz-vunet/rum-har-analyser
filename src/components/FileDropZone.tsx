import { useCallback, useRef, useState } from 'react';

interface FileDropZoneProps {
  onFileLoaded: (text: string, fileName: string) => void;
}

export default function FileDropZone({ onFileLoaded }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(
    (file: File) => {
      setError(null);
      if (!file.name.endsWith('.har') && !file.name.endsWith('.json')) {
        setError('Please provide a .har or .json file');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onFileLoaded(reader.result, file.name);
        }
      };
      reader.onerror = () => setError('Failed to read file');
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`cursor-pointer rounded-3xl border-2 border-dashed p-16 text-center transition-all ${
        isDragging
          ? 'border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-100'
          : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-200/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".har,.json"
        className="hidden"
        onChange={handleChange}
      />
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
        <svg
          className="h-10 w-10 text-indigo-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
      </div>
      <p className="text-2xl font-bold text-slate-800">
        Drop your HAR file here
      </p>
      <p className="mt-2 text-base text-slate-500">
        or click to browse (.har / .json)
      </p>
      <p className="mx-auto mt-4 max-w-lg text-sm text-slate-400">
        Upload a browser export and get instant OpenTelemetry analysis for
        documentLoad, web vitals, spans, logs, and replay/export health.
      </p>
      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
