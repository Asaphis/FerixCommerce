// Environment the console expects at runtime.
//
//   FERIX_API_BASE=https://runtime.codewords.ai/run/ferix_backend_mock_1efc4bd3
//   CODEWORDS_API_KEY=<your CodeWords key>
//
// FERIX_API_SERVICE is an alternative to FERIX_API_BASE: give it a service id and the
// client builds the URL from CODEWORDS_RUNTIME_URI.

export const REQUIRED_ENV = ["CODEWORDS_API_KEY", "CODEWORDS_RUNTIME_URI"] as const;
export const OPTIONAL_ENV = ["FERIX_API_BASE", "FERIX_API_SERVICE"] as const;
