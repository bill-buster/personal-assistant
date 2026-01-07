# Jules Handoff

## Missing `routing_accuracy.jsonl` Dataset

The `npm run eval` command, a mandatory step in the verification battery, is failing because the required dataset, `routing_accuracy.jsonl`, is missing from the project.

### Details

- The `eval` script (`src/evals/run_eval.ts`) expects this file to be present at `src/evals/routing_accuracy.jsonl`.
- A search of the entire project confirms that the file does not exist.

### Impact

- The agent evaluation suite (`npm run eval`) cannot be completed, leaving a gap in the verification coverage.

### Options

1.  **Re-create or restore the dataset:** The dataset may have been accidentally deleted or moved. If a canonical version exists elsewhere, it should be restored. Otherwise, a new dataset may need to be created based on historical data or test cases.
2.  **Temporarily disable the `eval` step:** If the dataset cannot be restored, the `eval` step could be temporarily disabled in the verification battery. This is not recommended, as it reduces test coverage.
3.  **Update the `eval` script:** If the dataset has been intentionally replaced or renamed, the `run_eval.ts` script should be updated to point to the new dataset.

### Recommendation

I recommend that a human developer investigate the history of the `routing_accuracy.jsonl` file to determine the appropriate course of action. I have left the `eval` step incomplete and will proceed with the remaining verification steps.

## Smoke Test Failure: Data Leakage

The `npm run smoke` command is failing due to data leakage. The test script expects all data files to be written to the `.assistant-data` directory, but they are instead being written to the `./data` directory.

### Details

- The smoke test (`scripts/smoke-test.sh`) correctly sets the `ASSISTANT_DATA_DIR` environment variable to a temporary directory.
- Despite this, the application continues to write data to the `./data` directory.
- This indicates that the application's configuration logic is not correctly prioritizing the `ASSISTANT_DATA_DIR` environment variable.

### Attempted Fixes

- I attempted to unset the `NODE_ENV` variable in the `smoke` script, in case a `development` setting was causing the application to default to the `./data` directory. This had no effect.
- I attempted to modify the configuration loading logic in `src/core/config.ts` to prioritize the `ASSISTANT_DATA_DIR` environment variable. These attempts were unsuccessful and resulted in further errors.

### Recommendation

I recommend that a human developer thoroughly review and refactor the configuration loading logic in `src/core/config.ts`. The current implementation has multiple points where the data directory can be set, leading to unpredictable behavior. A clear and explicit order of precedence should be established, with the `ASSISTANT_DATA_DIR` environment variable as the ultimate authority. I have left the smoke test in its failing state and will proceed with the `preflight` check.
