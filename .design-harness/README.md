# Programmatic Design Harness

This directory stores one evidence-backed run per bounded design task.

```bash
./.design-harness/design-harness new --workspace "$PWD" --slug example --kind ui
./.design-harness/design-harness check --workspace "$PWD" --run .design-harness/runs/<run-id> --phase spec
./.design-harness/design-harness scan-drift --workspace "$PWD" --run .design-harness/runs/<run-id>
./.design-harness/design-harness check --workspace "$PWD" --run .design-harness/runs/<run-id> --phase final
./.design-harness/design-harness seal --workspace "$PWD" --run .design-harness/runs/<run-id>
./.design-harness/design-harness check --workspace "$PWD" --run .design-harness/runs/<run-id> --phase ship
```

Edit `config.json` once to point at the project's tokens, components, Storybook stories, and Figma mapping. Do not put credentials or browser sessions in this directory.
