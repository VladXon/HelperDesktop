# GitHub Actions Workflows

## Workflows

### `ci.yml` — Continuous Integration

Runs on every push to any branch and every pull request targeting `master`.

Steps:
1. Install pnpm 9 and dependencies (`--frozen-lockfile`).
2. Lint all workspaces.
3. Typecheck all workspaces.
4. Run all unit and integration tests.
5. Build all shared packages and apps (server, bot, client bundles).

Builds are cached via `actions/cache` keyed on `pnpm-lock.yaml`.

### `deploy.yml` — Production Deployment

Runs on:
- push to `master` (after CI passes)
- manual trigger via the Actions tab (`workflow_dispatch`)

Steps:
1. Validates required secrets are present.
2. SSHes into the production server using an ED25519 key.
3. Pulls the latest code, installs deps, runs migrations, builds server and bot, then reloads PM2.

Deploys target `/opt/helperdesktop` on the production VPS.

## Required Secrets

| Name        | Description                                                                 |
|-------------|-----------------------------------------------------------------------------|
| `SSH_HOST`  | Hostname or IP of the production server. Example: `178.172.137.167`.        |
| `SSH_USER`  | SSH user with sudo / pm2 rights on the server. Example: `root`.             |
| `SSH_KEY`   | Private SSH key in PEM format (recommended ED25519 or RSA 4096).            |

Optional:

| Name        | Description                                                                                       |
|-------------|---------------------------------------------------------------------------------------------------|
| `VPS_HOST`  | If you maintain a separate DNS name and want it logged for human reference. Not used by workflows. |

## Adding the SSH Key

On the server, ensure your public key is in `~/.ssh/authorized_keys` for the user specified in `SSH_USER`.

To add the secret in GitHub:
1. Generate a keypair locally: `ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key`
2. Add `deploy_key.pub` to the server's `~/.ssh/authorized_keys`.
3. Copy the contents of `deploy_key` (private key) and add it as the `SSH_KEY` secret in repository settings.
4. Set `SSH_HOST` and `SSH_USER` to match the server.

## Manual Deploy

You can also deploy locally without GitHub:

```bash
REMOTE=root@178.172.137.167 bash scripts/deploy.sh
```
