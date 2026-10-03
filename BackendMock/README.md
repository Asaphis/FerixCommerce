# BackendMock — the simulated backend

A working stand-in for the production backend. It answers the same requests, at
the same addresses, with the same shapes of data, so the frontend is written
once and never knows the difference.

- Source: `ferix_backend_mock.py`
- Hosted at: `https://runtime.codewords.ai/run/ferix_backend_mock_1efc4bd3`

## Running it

```bash
uv run ferix_backend_mock.py
```

It needs `CODEWORDS_API_KEY` and `CODEWORDS_RUNTIME_URI` in the environment.
Accounts, carts, orders and sessions persist in Redis, so state survives
between requests.

## What it serves

Catalogue (products, categories, collections, stores, search), accounts
(register, sign in, profile, addresses, saved items, reviews, settings),
cart, and checkout (quotes, shipping, payment, orders).

## Replacing it

Point the frontend's `FERIX_API_BASE` at the production backend and nothing else
changes. No page or component is written against this simulator specifically.
