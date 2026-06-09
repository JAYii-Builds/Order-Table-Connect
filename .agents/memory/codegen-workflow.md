---
name: Codegen and typecheck workflow
description: Required steps after schema or OpenAPI changes
---

**After changing `lib/api-spec/openapi.yaml`:**
Run: `pnpm --filter @workspace/api-spec run codegen`
This regenerates React Query hooks in `lib/api-client-react/src/generated/` and Zod schemas in `lib/api-zod/src/generated/`. Also runs `typecheck:libs` automatically.

**After changing `lib/db/src/schema/`:**
Run: `pnpm run typecheck:libs` to rebuild composite lib declarations before checking leaf packages.

**Hook naming convention (from Orval):**
- `operationId: listOrders` → `useListOrders`, `getListOrdersQueryKey`
- `operationId: createOrder` → `useCreateOrder`
- `operationId: getOrder` → `useGetOrder`, `getGetOrderQueryKey`
- `operationId: updateOrderStatus` → `useUpdateOrderStatus`

**Why:** The OpenAPI spec `info.title` controls generated filenames — do NOT change it (`title: Api`).
