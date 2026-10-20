.PHONY: backend-test postgres-smoke frontend-check verify sections-report sections-prune

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

#: Placements pointing at a section that no longer exists.
sections-report:
	cd Backend && python3 prune_orphans.py

sections-prune:
	cd Backend && python3 prune_orphans.py --apply
