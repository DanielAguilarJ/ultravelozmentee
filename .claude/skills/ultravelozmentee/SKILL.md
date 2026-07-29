```markdown
# ultravelozmentee Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `ultravelozmentee` repository, a JavaScript backend project built with the Express framework. You'll learn the project's coding standards, commit message conventions, file organization, and testing patterns to ensure consistency and maintainability in your contributions.

## Coding Conventions

### File Naming
- Use **kebab-case** for all file names.
  - Example: `user-controller.js`, `order-service.js`

### Import Style
- Use **relative imports** for modules within the project.
  - Example:
    ```javascript
    import { getUser } from './user-service.js';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```javascript
    // user-service.js
    export function getUser(id) { ... }
    export function createUser(data) { ... }
    ```

### Commit Messages
- Follow **conventional commit** format.
- Use the `fix` prefix for bug fixes.
- Keep commit messages concise (average: 58 characters).
  - Example:
    ```
    fix: handle null user in authentication middleware
    ```

## Workflows

### Making a Code Change
**Trigger:** When you need to add or update code.
**Command:** `/make-change`

1. Create or update files using kebab-case naming.
2. Use relative imports and named exports.
3. Write or update tests in corresponding `.test.js` files.
4. Commit changes with a conventional commit message (e.g., `fix: ...`).
5. Push your branch and open a pull request.

### Writing and Running Tests
**Trigger:** When you add new features or fix bugs.
**Command:** `/run-tests`

1. Create a test file named `your-module.test.js` in the same or a `tests/` directory.
2. Write tests for your module (testing framework is currently unknown).
3. Run the test suite using the project's test runner (consult project documentation or package.json for exact command).

## Testing Patterns

- Test files follow the `*.test.js` naming convention.
- Place tests alongside the modules they test or in a dedicated `tests/` directory.
- Use the project's chosen testing framework (not specified; check for dependencies in `package.json`).

## Commands

| Command        | Purpose                                      |
|----------------|----------------------------------------------|
| /make-change   | Steps for making a code change               |
| /run-tests     | Steps for writing and running tests          |
```
