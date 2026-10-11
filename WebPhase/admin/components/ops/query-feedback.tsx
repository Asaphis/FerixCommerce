"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Surface redirect-based server-action failures without duplicating page-specific UI. */
export function QueryFeedback() {
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return null;
}
