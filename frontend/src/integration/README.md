# Integration Tests

This directory contains integration tests that verify the interaction between the frontend and backend components of the todo list application.

## Property 18: Round-Trip Consistency

**File:** `roundTrip.test.ts`

**Validates:** Requirements 1.1, 2.2, 8.1

**Description:** This property test verifies that for any todo created through the frontend, the todo should be persistable to the backend and retrievable such that all fields (title, description) match the original input.

### Test Coverage

The integration test suite includes:

1. **Main Property Test** (100 iterations)
   - Creates a todo with randomly generated title and description
   - Verifies the todo is persisted to the backend
   - Retrieves the todo and verifies all fields match
   - Verifies the todo appears in the list of all todos

2. **Edge Case: Empty Description**
   - Tests that empty descriptions are properly handled

3. **Edge Case: Maximum Length Fields**
   - Tests that maximum length titles (200 chars) and descriptions (1000 chars) are preserved

4. **Special Characters Handling**
   - Tests various special characters including quotes, brackets, ampersands, emojis, unicode, etc.
   - Note: The backend sanitizes HTML special characters for security (Requirement 7.4)

5. **Multiple Create-Retrieve Cycles** (50 iterations)
   - Creates multiple todos in sequence
   - Verifies all todos are correctly persisted and retrievable
   - Tests data integrity across multiple operations

## Property 19: Status Toggle Round-Trip

**File:** `statusToggle.test.ts`

**Validates:** Requirements 3.1, 3.2, 8.1

**Description:** This property test verifies that for any todo, toggling its completion status through the UI should persist the change such that refreshing the page shows the updated status.

### Test Coverage

The integration test suite includes:

1. **Main Property Test** (100 iterations)
   - Creates a todo (starts as incomplete)
   - Toggles status to completed and verifies persistence
   - Retrieves the todo and verifies completed status persists
   - Toggles status back to incomplete and verifies persistence
   - Retrieves the todo again and verifies incomplete status persists
   - Verifies the todo appears in the list with correct status

2. **Multiple Status Toggles in Sequence**
   - Tests multiple consecutive toggles (true → false → true → false → true)
   - Verifies each toggle persists correctly
   - Verifies status is reflected in both individual retrieval and list

3. **Field Preservation During Status Updates**
   - Toggles status to completed
   - Updates title while keeping status
   - Verifies status remains completed after title update
   - Ensures status updates don't affect other fields

4. **Concurrent Status Toggles** (20 iterations)
   - Creates multiple todos
   - Toggles all todos to completed concurrently
   - Verifies all todos are completed
   - Toggles all todos back to incomplete concurrently
   - Verifies all todos are incomplete

5. **Persistence Across Application Restart Simulation**
   - Creates a todo and toggles to completed
   - Simulates multiple page refreshes (5 retrievals)
   - Verifies status remains completed across all retrievals
   - Toggles back to incomplete
   - Simulates multiple page refreshes again
   - Verifies status remains incomplete across all retrievals

## End-to-End Tests

**File:** `e2e.test.ts`

**Validates:** Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 10.1

**Description:** These end-to-end tests verify complete user workflows from the frontend perspective, testing full scenarios that users would actually perform.

### Test Coverage

The end-to-end test suite includes:

1. **Complete User Workflow: Create → Edit → Complete → Delete**
   - Tests the full lifecycle of a todo item
   - Verifies each step persists correctly
   - Tests with single and multiple todos
   - Validates data integrity throughout the workflow

2. **Filter Switching with Mixed Todo States**
   - Tests filtering todos by completion status (all, active, completed)
   - Verifies filter correctness with mixed todo states
   - Tests filter persistence when toggling todo completion
   - Tests edge cases (no todos, only active, only completed)

3. **Error Scenarios**
   - Tests validation errors (empty title, whitespace-only title, exceeding max length)
   - Tests 404 errors (non-existent todo retrieval, update, deletion)
   - Tests network error handling
   - Verifies error response format consistency

4. **Responsive Layout and Data Integrity**
   - Tests todos with various content lengths (short, medium, maximum)
   - Tests special characters and unicode handling
   - Tests concurrent operations (create, update, delete)
   - Verifies data integrity under load

5. **Complex User Scenarios**
   - Tests rapid create-edit-delete cycles
   - Tests mixed operations on multiple todos
   - Verifies filter behavior with complex state changes
   - Tests real-world usage patterns

### Running the Tests

#### Prerequisites

The backend server must be running for these tests to execute. If the backend is not available, the tests will gracefully skip with a warning message.

To start the backend:

```bash
cd backend
source venv/bin/activate
python app.py
```

#### Running the Tests

To run all integration tests:

```bash
cd frontend
npm test -- --run src/integration/
```

To run a specific integration test:

```bash
# Property 18: Round-Trip Consistency
npm test -- --run src/integration/roundTrip.test.ts

# Property 19: Status Toggle Round-Trip
npm test -- --run src/integration/statusToggle.test.ts

# End-to-End Tests
npm test -- --run src/integration/e2e.test.ts
```

Or to run with the backend in the background:

```bash
# Terminal 1: Start backend
cd backend && source venv/bin/activate && python app.py

# Terminal 2: Run tests
cd frontend && npm test -- --run src/integration/
```

### Important Notes

1. **HTML Sanitization**: The backend sanitizes HTML special characters (`<`, `>`, `"`, `'`, `&`) to prevent XSS attacks (Requirement 7.4). The property tests filter out these characters from generated test data to focus on pure round-trip consistency. HTML sanitization is tested separately in Property 7.

2. **Backend Availability**: The tests check if the backend is available before running. If not available, they skip gracefully with helpful messages.

3. **Test Cleanup**: Each test cleans up after itself by deleting created todos to ensure test isolation.

4. **Property-Based Testing**: Uses `fast-check` library to generate random test data and run multiple iterations, providing better coverage than example-based tests.

5. **Test Timeouts**: Some tests (especially concurrent operations) have increased timeouts to accommodate slower systems or network conditions.

### Test Results

When the backend is running, all tests should pass:

**Property 18: Round-Trip Consistency**
- ✓ should persist and retrieve todo with all fields matching original input
- ✓ should handle edge case of empty description
- ✓ should handle edge case of maximum length title and description
- ✓ should handle special characters in title and description
- ✓ should maintain data integrity across multiple create-retrieve cycles

**Property 19: Status Toggle Round-Trip**
- ✓ should persist completion status toggle and reflect it on retrieval
- ✓ should handle multiple status toggles in sequence
- ✓ should preserve status when updating other fields
- ✓ should handle concurrent status toggles correctly
- ✓ should maintain status across application restart simulation

When the backend is not running, all tests skip gracefully with informative messages.
