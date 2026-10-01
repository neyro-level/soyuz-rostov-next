# Changelog

Every released `starter-v2.MINOR.PATCH` section must include a `Client migration`
subsection. A version is not released by editing this file: release manifest and
immutable tag creation remain separate owner-gated actions.

## [Unreleased]

### Client migration

- Introduce `.starter-version`, the starter-owned manifest and conflict-safe
  upgrade channel. No released tag is created by Plan 11 implementation.
