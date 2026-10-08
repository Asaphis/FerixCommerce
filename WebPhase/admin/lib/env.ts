// Environment the console expects at runtime.
//
//   FERIX_API_BASE=http://127.0.0.1:8003
//
// FERIX_API_BASE is the only API endpoint setting; change it per environment.

export const REQUIRED_ENV = ["FERIX_API_BASE"] as const;
export const OPTIONAL_ENV = ["CODEWORDS_API_KEY"] as const;
