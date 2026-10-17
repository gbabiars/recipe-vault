# Shared components

This directory contains Recipe Vault-specific presentational components used
by both the app and MCP views. Place a component here when it composes generic
`ui` components around recipe-specific product concepts, while leaving route,
transport, and data-access behavior with its app or MCP consumer.

Keep generic primitives in `ui`, recipe services and transformations in
`src/lib/recipes`, and database access in `src/lib/db`.
