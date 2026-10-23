fetch:
	python3 tools/fetch_sources.py
	python3 tools/fetch_tests.py
	python3 tools/fetch_benchmark_euler.py
	python3 tools/fetch_benchmark_leetcode.py

build:
	python3 tools/build.py
	python3 tools/build_tests.py
	python3 tools/build_benchmark_euler.py
	python3 tools/build_benchmark_leetcode.py

check:
	python3 tools/validate.py
	python3 tools/validate_benchmark.py
	python3 tools/query.py --stats

.PHONY: fetch build check
