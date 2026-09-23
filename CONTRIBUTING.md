# Contributing

Fork the repository, create a focused branch, run `npm ci && npm run check`, and open a pull request describing behavior, tests and limitations. Contributions to policy validation, Solana parsing, simulation, documentation, tests and UI are welcome.

Never commit secrets or user transaction data. Label deterministic demonstrations **LAB SIMULATION**; do not present them as live telemetry. Do not claim an experimental parser or verdict is a production security guarantee. When adding a new policy field, update its schema, examples, docs and tests together. Security-sensitive changes need threat-model notes.
