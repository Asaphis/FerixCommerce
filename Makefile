.PHONY: backend-test postgres-smoke frontend-check verify

backend-test:
	cd Backend && python3 -m unittest discover -s tests -v

postgres-smoke:
	cd Backend && python3 tests/postgres_migration_smoke.py

frontend-check:
	set -eu; \
	for app in WebPhase/admin WebPhase/merchant WebPhase/marketplace; do \
	  echo "== $$app =="; \
	  cd "$$app"; \
	  npm ci; \
	  npm run typecheck; \
	  npm run build; \
	  cd - >/dev/null; \
	done

verify: backend-test postgres-smoke frontend-check
