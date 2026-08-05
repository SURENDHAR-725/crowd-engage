# Run Doc — AI Quiz Builder

## How to reproduce uncommitted artifacts

- **`.env`**: Already present in the worktree. No env file copying needed.
- **`node_modules`**: Already installed. If missing, run `npm install`.

## How to run the dev server

1. Make sure you're in the project root:
   ```bash
   cd "D:/project/AI Quiz Builder1/Backup/AI Quiz Builder"
   ```

2. Check which port is free (default is 8080):
   ```bash
   lsof -i :8080 2>/dev/null || echo "FREE"
   ```

3. Start Vite dev server:
   ```bash
   nohup npx vite --port 8080 --host > .freebuff/preview-thmrtdlh483yac.log 2>&1 &
   ```

   If port 8080 is taken, Vite will auto-increment (8081, 8082, etc.).

4. Poll until the server responds:
   ```bash
   curl -s http://localhost:PORT/
   ```

5. Find the actual PID for `register_preview`:
   ```bash
   netstat -ano | grep ":PORT" | grep LISTENING
   ```

6. Register the preview with `register_preview` using the URL and PID.
