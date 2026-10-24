# Repository Instructions

## Architecture

- Keep dependencies pointing inward: `domain` must not depend on NestJS, Prisma, Redis, or framework code.
- Keep use cases independent of concrete adapters; use the existing ports for persistence, idempotency, and event publishing.
- Keep controllers and DTOs in presentation, and put NestJS, Prisma, Redis, and SSE details in infrastructure or their integration points.
- `@rcm/contracts` contains shared types and constants only; runtime validation and business logic belong elsewhere.
- Apply SOLID pragmatically: separate responsibilities and reduce coupling when it improves clarity; avoid speculative abstractions and overengineering.
- Treat the database unique constraint on `call_id` as the final idempotency guarantee. Redis may optimize duplicate handling but must not replace database integrity.

## Code

- Follow the patterns and conventions already used by the package or module being changed.
- Do not add comments that restate the code. Comment only non-obvious decisions or constraints, explain why they exist, and write code comments in English.
- Do not add dependencies when the installed toolchain can solve the problem.
- Do not commit secrets or `.env` files; document required variables in `.env.example`.
- Avoid unrelated changes and preserve existing local work.
- Use `import type` for contract interfaces in decorated NestJS signatures when `isolatedModules` and `emitDecoratorMetadata` require it.
- Check the package's installed tool versions before changing configuration or generating files. In particular, do not assume Prisma configuration is identical across major versions.

## Tests and Validation

- Add or update tests for changed behavior, especially idempotency, concurrency, and domain rules where relevant.
- Name tests after the behavior they verify. Use `should` or `when` only when it makes the scenario clearer; do not enforce a rigid naming template.
- Run the relevant tests and build for the affected package before considering a change complete.
- Use pnpm and the single root lockfile; do not create lockfiles inside packages.
- Do not mark implementation-plan items complete until the work is implemented and validated.
