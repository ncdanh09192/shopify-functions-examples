# Shopify Functions Examples — Project Guidelines

## Language Policy

**English only** for all of the following:
- Source code (variable names, function names, type names)
- Code comments (inline and block)
- GraphQL queries and field descriptions
- Commit messages
- Branch names
- Pull request titles and descriptions
- File names

**Vietnamese** is allowed only in:
- Chat conversations and prompts (e.g. with AI assistants)
- Personal notes outside the repository

### Examples

```ts
// ✅ Correct
// Filter lines that have the "bxgy-eligible" tag
const eligibleLines = cart.lines.filter(...);

// ❌ Wrong
// Lọc các lines có tag "bxgy-eligible"
const eligibleLines = cart.lines.filter(...);
```

```
# ✅ Correct commit message
feat(discount): add buy-x-get-y function with configurable tiers

# ❌ Wrong commit message
feat: thêm function buy x get y
```

---

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

**Scopes:** `discount`, `shipping`, `payment`, `cart-transform`, `order-routing`

### Examples
```
feat(discount): add buy-x-get-y function with tag-based eligibility
fix(shipping): handle null metafield in free-threshold config
test(discount): add boundary case fixture for bxgy-not-enough-qty
docs(shipping): update README with metafield config instructions
```

---

## Code Style

- **Language:** TypeScript (preferred over JavaScript)
- **Formatting:** Follow existing ESLint/Prettier config
- Each function extension must have:
  - A block comment at the top explaining what it does, its config shape, and behavior
  - Test fixtures covering: happy path, edge cases, fallback/default config
  - A `README.md` inside its extension folder

---

## Project Structure

```
extensions/
  <function-name>/
    src/
      *.graphql     # Input query — defines what data the function receives
      *.ts          # Function logic
    tests/
      fixtures/     # One JSON file per test scenario
      default.test.js
    README.md       # Required: use case, config, how to deploy
```

---

## Testing

Every function must have fixtures covering:
1. **Happy path** — expected discount/customization applied
2. **Below threshold / not enough quantity** — no operations returned
3. **Missing or null metafield** — default config fallback works
4. **Edge cases** — exact boundary values, empty cart, wrong discount class

Run tests:
```bash
cd extensions/<function-name>
npm test
```
