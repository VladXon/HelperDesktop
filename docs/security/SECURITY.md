# Security

## Passwords
- scrypt N=16384 r=8 p=1 keylen=64, salt 16 bytes
- timingSafeEqual comparison
- Min 8 chars + upper + lower + digit

## JWT
- HS256 algorithm
- Access token: 15m expiry
- Refresh token: 7d expiry
- Rotation with reuse detection

## Lockout
- 5 failed attempts per login+IP in 15m → blocked 30m

## Rate Limiting
- 100 req/min global (1000 in dev)
- 5 req/min on auth routes
- Skipped in test environment

## Bot Auth
- `X-Bot-Secret` header verification
- timingSafeEqual comparison

## Client Tokens
- Electron safeStorage (DPAPI on Windows / Keychain on macOS)

## HTTP
- helmet (CSP/HSTS) in production only

## Audit Log
- All sensitive operations logged
- 90 day retention
