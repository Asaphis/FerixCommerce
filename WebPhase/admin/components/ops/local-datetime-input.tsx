"use client";

import { useEffect, useRef, useState } from "react";

function toLocalInput(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  // Legacy datetime-local values were stored without an offset. Treat them as
  // the wall-clock time the operator entered; newly submitted values are UTC.
  if (!/(?:Z|[+-]\d\d:\d\d)$/i.test(raw)) return raw.slice(0, 16);
  const instant = new Date(raw);
  if (!Number.isFinite(instant.getTime())) return "";
  const local = new Date(instant.getTime() - instant.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toUtcIso(localValue: string): string {
  if (!localValue) return "";
  const instant = new Date(localValue);
  return Number.isFinite(instant.getTime()) ? instant.toISOString() : "";
}

/** A local-clock input whose submitted value is an explicit UTC timestamp. */
export function LocalDateTimeInput({
  name,
  value,
  required = false,
  className,
}: {
  name: string;
  value?: string | null;
  required?: boolean;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState("");
  const submittedValue = toUtcIso(localValue);
  const hiddenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(toLocalInput(value));
  }, [value]);

  return (
    <>
      <input
        type="datetime-local"
        value={localValue}
        required={required}
        className={className}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setLocalValue(next);
          if (hiddenRef.current) hiddenRef.current.value = toUtcIso(next);
        }}
      />
      <input ref={hiddenRef} type="hidden" name={name} value={submittedValue} readOnly />
    </>
  );
}
