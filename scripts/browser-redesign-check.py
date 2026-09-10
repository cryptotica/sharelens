"""Run browser checks synchronously against a fresh production server, then stop it."""
import json
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen

out = Path('run_records/redesign-browser-20260908')
out.mkdir(parents=True, exist_ok=True)
url = 'http://127.0.0.1:3012'
results = []
with (out / 'server.log').open('w', encoding='utf-8') as log:
    server = subprocess.Popen(
        ['node', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3012'],
        stdout=log, stderr=subprocess.STDOUT,
    )
    try:
        for _ in range(60):
            if server.poll() is not None:
                raise RuntimeError(f'Production server exited: {server.returncode}')
            try:
                with urlopen(url, timeout=2) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(1)
        else:
            raise RuntimeError('Production server did not become ready')
        for script, output in [('browser-smoke.py', str(out)), ('browser-wallet-smoke.py', str(out / 'wallet-smoke.json'))]:
            command = [sys.executable, f'scripts/{script}', '--url', url, '--output', output]
            result = subprocess.run(command, timeout=360)
            results.append({'script': script, 'exit_code': result.returncode})
    finally:
        server.terminate()
        try:
            server.wait(timeout=15)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
        (out / 'commands.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(json.dumps(results))
sys.exit(0 if results and all(r['exit_code'] == 0 for r in results) else 1)
