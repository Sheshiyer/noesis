# Noesis Raycast Extension — Dev Workflow

## Quick Start

```bash
cd /Users/sheshnarayaniyer/raycast-extensions/noesis

# 1. Start the dev watcher (compiles + hot-reloads on file changes)
ray develop

# 2. In Raycast, type any Noesis command to see live changes
```

## Dev Extension Status

✅ Extension linked: `~/Library/Application Support/Raycast/extensions/dev/noesis`
✅ Dev watcher running: PID 40627
✅ Raycast app: Open

## Testing NadaBrahman End-to-End

### Step 1: Configure API Key in Dev Mode

Open Raycast → type `Noesis API Key`:

| Field | Value |
|-------|-------|
| Base URL | `https://selemene.tryambakam.space` |
| Access Key | `nk_your_production_key` |
| Execution Route | `Selemene Direct` |

> **Dev mode uses separate preferences from the installed extension.**
> Even if you configured it in the published extension, you must re-enter it in dev mode.

### Step 2: Test the Commands

| Raycast Command | What to Verify |
|-----------------|----------------|
| `Noesis Dashboard` | Scroll to "NadaBrahman Remedy" card — should show current raga |
| `Noesis Pulse & Remedy` | Menu bar drops down with raga name + prahar window |
| `Noesis Daily Witness` | Should include NadaBrahman in the workflow output |
| `Noesis Developer Tools` | Check "Connection" tab — status should be green; note the "Engine and workflow route" line and the two guidance lines below it |

### Step 3: Watch the Dev Console

The `ray develop` terminal shows:
- Recompilation on every file save
- TypeScript errors inline
- Hot-reload notifications

## Hot-Reload Testing

1. Edit `src/lib/menu-bar-insights.ts`
2. Save the file
3. `ray develop` auto-recompiles (~1-2s)
4. Re-run any Noesis command in Raycast — changes appear immediately

## Common Dev Issues

### "Extension not found"
```bash
# Re-link manually
mkdir -p ~/Library/Application\ Support/Raycast/extensions/dev
ln -sf /Users/sheshnarayaniyer/raycast-extensions/noesis \
  ~/Library/Application\ Support/Raycast/extensions/dev/noesis
```

### "Build failed" in Raycast
Check the `ray develop` terminal for the actual TypeScript error.

### "API key invalid" in dev but works in installed version
Dev mode has **separate** Raycast preferences. Re-enter the API key in the dev extension.

## Running the Integration Test

```bash
cd /Users/sheshnarayaniyer/raycast-extensions/noesis

# Test against local server
API_KEY="nk_fd9JCY8o3jcRfHdQmXDksh4ekzNSJkHj" \
BASE_URL="http://localhost:8080" \
npx tsx src/lib/nadabrahman-integration-test.ts

# Test against production
API_KEY="nk_your_production_key" \
BASE_URL="https://selemene.tryambakam.space" \
npx tsx src/lib/nadabrahman-integration-test.ts
```

## Stopping Dev Mode

```bash
# Find and kill the watcher
pkill -f "ray develop"

# Or stop the background task if running in a terminal
```
