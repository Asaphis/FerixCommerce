// The console defaults to the existing hosted REST API. These values are
// optional overrides for deployments that use another API host.

export const REQUIRED_ENV = [] as const;
export const OPTIONAL_ENV = ["FERIX_API_BASE", "NEXT_PUBLIC_FERIX_API_BASE", "CODEWORDS_API_KEY"] as const;
