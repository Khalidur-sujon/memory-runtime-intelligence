# Changelog

All notable changes to **Memory Runtime Intelligence** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-09-15

### Added

- Added source map-aware resource lifecycle analysis.
- Added runtime source map loading and generated-to-original source location resolution.
- Added resolved source locations to persisted resources.

### Improved

- Updated lifecycle analysis to use resource-level source locations.
- Improved source location capture across tracked resources.
- Extended resource creation metadata for timers, observers, WebSockets, and event listeners.
- Improved observer and resource lifecycle tracking.
- Updated package metadata and lockfile.

### Summary

Improved source attribution and lifecycle analysis to make resource retention findings easier to trace back to the original application source.

## [1.0.0] - 2026-09-14

### Added

- Added runtime resource retention detection.
- Added event listener tracking.
- Added observer tracking.
- Added timer and interval tracking.
- Added WebSocket tracking.
- Added resource creation and release statistics.
- Added confidence-based retention analysis.
- Added CLI reporting.
- Added React and Vite support.

### Summary

Initial production release of Memory Runtime Intelligence, providing runtime diagnostics for detecting and investigating unreleased browser resources.

[1.0.1]: https://github.com/Khalidur-sujon/memory-runtime-intelligence/releases/tag/v1.0.1
[1.0.0]: https://github.com/Khalidur-sujon/memory-runtime-intelligence/releases/tag/v1.0.0
