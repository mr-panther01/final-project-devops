#!/bin/bash
# Load test script to generate traffic and trigger Horizontal Pod Autoscaler (HPA)

TARGET_URL="${1:-http://localhost:8000}"
CONCURRENCY="${2:-10}"
REQUESTS="${3:-500}"

echo "=========================================================="
echo "Starting TaskBoard Load Test against: $TARGET_URL"
echo "Concurrency: $CONCURRENCY | Total Requests: $REQUESTS"
echo "=========================================================="

# Check if wrk or ab or python is available
if command -v ab &> /dev/null; then
    echo "Using ApacheBench (ab)..."
    ab -n "$REQUESTS" -c "$CONCURRENCY" "$TARGET_URL/api/tasks"
elif command -v python3 &> /dev/null; then
    echo "Running Python concurrent load generator..."
    python3 -c "
import urllib.request
import concurrent.futures
import time

url = '$TARGET_URL/api/tasks'
success = 0
failed = 0

def fetch():
    global success, failed
    try:
        with urllib.request.urlopen(url) as response:
            if response.status == 200:
                success += 1
            else:
                failed += 1
    except Exception:
        failed += 1

start = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=$CONCURRENCY) as executor:
    futures = [executor.submit(fetch) for _ in range($REQUESTS)]
    concurrent.futures.wait(futures)
duration = time.time() - start

print(f'Completed {success + failed} requests in {duration:.2f}s (Success: {success}, Failed: {failed})')
print(f'RPS: {(success + failed) / duration:.2f}')
"
else
    echo "Running curl loop..."
    for i in $(seq 1 "$REQUESTS"); do
        curl -s -o /dev/null "$TARGET_URL/api/tasks" &
        if (( i % 20 == 0 )); then
            wait
        fi
    done
    wait
fi

echo "=========================================================="
echo "Load test complete! Check HPA via: kubectl get hpa -n taskboard"
echo "=========================================================="
