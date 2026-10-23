fetch:
	python3 tools/fetch_sources.py
	python3 tools/fetch_tests.py

build:
	python3 tools/build.py
	python3 tools/build_tests.py

check:
	python3 tools/validate.py
	python3 tools/query.py --stats

.PHONY: fetch build check
