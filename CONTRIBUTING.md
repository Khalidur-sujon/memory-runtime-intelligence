# Contributing to Memory Runtime Intelligence

Thank you for your interest in contributing to **Memory Runtime Intelligence (MRI)**.

MRI is an open-source runtime diagnostics tool for detecting and investigating unreleased browser resources in web applications. Contributions that improve reliability, diagnostics, developer experience, documentation, or supported integrations are welcome.

## Development Setup

### 1. Fork and clone the repository

```bash
git clone https://github.com/Khalidur-sujon/memory-runtime-intelligence.git
cd memory-runtime-intelligence
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the project

```bash
npm run build
```

Before submitting a change, make sure the project builds successfully.

## Making Changes

1. Create a branch from `main`.

```bash
git checkout -b feature/your-change
```

2. Make your changes.
3. Keep changes focused and minimal.
4. Update documentation when behavior or public APIs change.
5. Run the build and relevant checks before submitting a pull request.

## Commit Messages

Use clear, descriptive commit messages.

Recommended prefixes:

- `feat:` — add a new feature
- `fix:` — fix a bug
- `docs:` — documentation changes
- `refactor:` — code restructuring without behavior changes
- `test:` — add or update tests
- `chore:` — maintenance or tooling changes

Examples:

```text
feat: add source map resource resolution
fix: improve observer cleanup detection
docs: update installation guide
refactor: simplify resource lifecycle analysis
```

## Pull Requests

Before opening a pull request:

- Make sure the project builds successfully.
- Keep the pull request focused on one change.
- Update relevant documentation.
- Provide a clear description of what changed and why.
- Mention any known limitations or important implementation details.

Pull requests should target the `main` branch.

## Bug Reports

When reporting a bug, include:

- A clear description of the problem.
- Steps to reproduce it.
- Expected behavior.
- Actual behavior.
- Relevant error messages or logs.
- Environment details when applicable.

A minimal reproduction is highly appreciated.

## Feature Requests

Feature requests are welcome.

Please explain:

- The problem you are trying to solve.
- Why the feature would be useful.
- How you expect it to work.
- Any relevant examples or use cases.

## Code Quality

Please:

- Follow the existing project structure and conventions.
- Prefer simple and maintainable implementations.
- Avoid unrelated changes in the same pull request.
- Preserve existing behavior unless the change intentionally modifies it.

## Documentation

Documentation improvements are welcome.

If a change affects installation, usage, configuration, CLI behavior, public APIs, or supported environments, update the relevant documentation.

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
