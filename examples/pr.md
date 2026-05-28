# Add retry logic for transient API failures

## Summary

This PR adds automatic retry with exponential backoff when the OpenAI API returns transient errors (429, 500, 502, 503). This improves reliability for users running the tool in CI pipelines where intermittent network issues are common.

## Changes

- Added `retryWithBackoff` utility in `src/retry.ts`
- Wrapped the OpenAI API call in `triage.ts` with retry logic (max 3 attempts)
- Added `--max-retries` CLI flag to allow users to configure retry behavior
- Added unit tests for the retry utility

## Testing

- Added 6 new tests for retry logic (success on first try, success after retry, max retries exceeded, non-retryable errors)
- Manually tested with simulated 429 responses
- All existing tests still pass

## Breaking Changes

None. The retry behavior is opt-in with sensible defaults.
