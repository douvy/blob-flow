.PHONY: test test-coverage

NPM = npm
COVERAGE_THRESHOLD ?= 90

test:
	$(NPM) run test

test-coverage:
	$(NPM) run test-coverage
	@COVERAGE=$$(node -e "const s=require('./coverage/coverage-summary.json').total.lines.pct; console.log(s);"); \
	echo "Total coverage: $${COVERAGE}%"; \
	if awk -v cov="$${COVERAGE}" -v threshold="$(COVERAGE_THRESHOLD)" 'BEGIN {exit !(cov < threshold)}'; then \
		echo "FAIL: Coverage $${COVERAGE}% is below $(COVERAGE_THRESHOLD)% threshold"; \
		exit 1; \
	fi; \
	echo "OK: Coverage $${COVERAGE}% meets $(COVERAGE_THRESHOLD)% threshold"
