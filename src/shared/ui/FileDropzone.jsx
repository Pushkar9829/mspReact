import { useId, useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { cn } from "./cn.js";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MEDIA_TYPES = [...IMAGE_TYPES, "application/pdf"];
export const CSV_TYPES = ["text/csv", "application/vnd.ms-excel", "text/plain", ".csv"];
export const MB = 1024 * 1024;

function matches(file, accept) {
  if (!accept?.length) return true;
  const name = file.name.toLowerCase();
  return accept.some((a) => (a.startsWith(".") ? name.endsWith(a) : a.endsWith("/*") ? file.type.startsWith(a.slice(0, -1)) : file.type === a));
}

function sizeLabel(bytes) {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Drag & drop / click-to-pick file input that validates type and size before upload.
 *
 *   <FileDropzone accept={MEDIA_TYPES} maxSize={10 * MB} multiple onFiles={(files) => upload(files)}
 *                 label="Upload images" hint="PNG, JPG, WebP or GIF up to 10 MB" />
 * Rejected files are listed inline (and passed to onReject). The backend still sniffs content.
 */
export function FileDropzone({ accept = [], maxSize = 10 * MB, multiple = false, onFiles, onReject, label = "Drop a file here or click to browse", hint, disabled, className, busy }) {
  const id = useId();
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [errors, setErrors] = useState([]);

  function handle(list) {
    const files = Array.from(list || []);
    const ok = [];
    const bad = [];
    files.slice(0, multiple ? files.length : 1).forEach((file) => {
      if (!matches(file, accept)) bad.push({ file, reason: "File type not allowed" });
      else if (maxSize && file.size > maxSize) bad.push({ file, reason: `Larger than ${sizeLabel(maxSize)}` });
      else ok.push(file);
    });
    setErrors(bad);
    if (bad.length) onReject?.(bad);
    if (ok.length) onFiles?.(ok);
    if (input.current) input.current.value = "";
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!disabled) handle(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-2 px-4 py-8 text-center transition-colors",
          "hover:border-primary hover:bg-primary-soft/40 focus-within:outline-2 focus-within:outline-ring",
          over && "border-primary bg-primary-soft/60",
          (disabled || busy) && "pointer-events-none opacity-60"
        )}
      >
        <FileUp aria-hidden className="size-6 text-fg-subtle" />
        <span className="text-ui-sm font-medium text-fg">{busy ? "Uploading…" : label}</span>
        {hint ? <span className="text-ui-xs text-fg-subtle">{hint}</span> : null}
        <input
          ref={input}
          id={id}
          type="file"
          className="sr-only"
          multiple={multiple}
          disabled={disabled || busy}
          accept={accept.join(",")}
          onChange={(e) => handle(e.target.files)}
        />
      </label>
      {errors.length ? (
        <ul className="grid gap-1" role="alert">
          {errors.map((e) => (
            <li key={e.file.name} className="flex items-center justify-between gap-2 rounded-md bg-danger-soft px-2.5 py-1.5 text-ui-xs text-danger-fg">
              <span className="truncate">
                {e.file.name} — {e.reason}
              </span>
              <button type="button" aria-label="Dismiss" onClick={() => setErrors((prev) => prev.filter((x) => x !== e))}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default FileDropzone;
