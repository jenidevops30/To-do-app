# API Documentation: User Login Feature

## Overview

This document provides comprehensive documentation for the authentication and todo management API endpoints. The API implements secure user authentication with session management, CSRF protection, and rate limiting.

**Base URL**: `https://api.example.com/api`

**Authentication**: Session-based with HTTP-only cookies

**Content-Type**: `application/json`

---

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Todo Endpoints](#todo-endpoints)
3. [Error Responses](#error-responses)
4. [CSRF Protection](#csrf-protection)
5. [Rate Limiting](#rate-limiting)
6. [Security Headers](#security-headers)
7. [Examples](#examples)

---

## Authentication Endpoints

### POST /api/auth/signup

Create a new user account.

**Requires**: CSRF token

**Rate Limit**: 10 requests per hour per IP address

**Request Body**:
```json
{
  "username": "string (required, 3-50 characters, alphanumeric + underscore)",
  "password": "string (required, 8+ characters, must contain letters and numbers)",
  "csrfToken": "string (required)"
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Account created successfully"
}
```

**Validation Error Response (400 Bad Request)**:
```json
{
  "error": "Validation failed",
  "errors": {
    "username": ["Username must be at least 3 characters"],
    "password": ["Password must contain both letters and numbers"]
  }
}
```

**Duplicate Username Response (409 Conflict)**:
```json
{
  "error": "Username already taken"
}
```

**Rate Limit Response (429 Too Many Requests)**:
```json
{
  "error": "Too many requests. Please try again later."
}
```

**Validation Rules**:
- Username: 3-50 characters, alphanumeric characters and underscores only
- Password: Minimum 8 characters, must contain at least one letter and one number
- Both fields are required

**Validates**: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8

---

### POST /api/auth/login

Authenticate a user and create a session.

**Requires**: CSRF token

**Rate Limit**: 5 requests per 15 minutes per IP, 10 per hour per IP

**Request Body**:
```json
{
  "username": "string (required)",
  "password": "string (required)",
  "csrfToken": "string (required)"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "csrfToken": "new_csrf_token_for_next_request"
}
```

Sets HTTP-only session cookie:
- Name: `session_token`
- Max-Age: 86400 seconds (24 hours)
- Flags: `HttpOnly`, `Secure`, `SameSite=Strict`
- Path: `/`

**Authentication Error Response (401 Unauthorized)**:
```json
{
  "error": "Invalid credentials"
}
```

**Rate Limit Response (429 Too Many Requests)**:
```json
{
  "error": "Too many requests. Please try again later."
}
```

**Important Notes**:
- The error message is intentionally generic to prevent username enumeration attacks
- The same error is returned for both invalid username and invalid password
- Session token is stored in an HTTP-only cookie and cannot be accessed by JavaScript
- A new CSRF token is returned for use in subsequent requests

**Validates**: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7

---

### POST /api/auth/logout

Invalidate the current session and logout the user.

**Requires**: Valid session token (in cookie), CSRF token

**Request Body**:
```json
{
  "csrfToken": "string (required)"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

Clears HTTP-only session cookie:
- Name: `session_token`
- Max-Age: 0 (immediately expires)
- Flags: `HttpOnly`, `Secure`, `SameSite=Strict`
- Path: `/`

**Authentication Error Response (401 Unauthorized)**:
```json
{
  "error": "Not authenticated"
}
```

**CSRF Error Response (403 Forbidden)**:
```json
{
  "error": "Request validation failed. Please try again."
}
```

**Important Notes**:
- The session token is invalidated on the server side
- The session cookie is cleared on the client side
- After logout, the session token cannot be used for subsequent requests

**Validates**: Requirements 4.1, 4.2, 4.4

---

### GET /api/auth/csrf-token

Obtain a CSRF token for unauthenticated or authenticated requests.

**Requires**: None (works for both authenticated and unauthenticated users)

**Query Parameters**: None

**Success Response (200 OK)**:
```json
{
  "csrfToken": "csrf_token_string"
}
```

**Important Notes**:
- For unauthenticated users: Returns a temporary CSRF token for signup/login forms
- For authenticated users: Returns a session-specific CSRF token
- CSRF tokens are single-use and rotate after each state-changing request
- Tokens expire after 1 hour

**Validates**: Requirements 11.1, 11.4

---

### GET /api/auth/me

Get information about the currently authenticated user.

**Requires**: Valid session token (in cookie)

**Query Parameters**: None

**Success Response (200 OK)**:
```json
{
  "user": {
    "id": "user-uuid-string",
    "username": "john_doe"
  }
}
```

**Authentication Error Response (401 Unauthorized)**:
```json
{
  "error": "Not authenticated"
}
```

**Important Notes**:
- This endpoint can be used to verify if a user is currently authenticated
- Returns the user's ID and username
- Useful for restoring authentication state on page load

**Validates**: Requirements 3.2, 3.6

---

## Todo Endpoints

All todo endpoints require a valid session token and are user-scoped (users can only access their own todos).

### GET /api/todos

Retrieve all todos for the authenticated user.

**Requires**: Valid session token (in cookie)

**Query Parameters**: None

**Success Response (200 OK)**:
```json
[
  {
    "id": 1,
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "completed": false,
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-15T10:30:00",
    "user_id": "user-uuid"
  },
  {
    "id": 2,
    "title": "Complete project",
    "description": "Finish authentication feature",
    "completed": true,
    "created_at": "2024-01-14T09:00:00",
    "updated_at": "2024-01-15T14:20:00",
    "user_id": "user-uuid"
  }
]
```

**Authentication Error Response (401 Unauthorized)**:
```json
{
  "error": "Not authenticated"
}
```

**Important Notes**:
- Returns only todos belonging to the authenticated user
- Results are not paginated (returns all user's todos)
- Todos are returned in the order they were created

**Validates**: Requirements 5.1, 5.6

---

### POST /api/todos

Create a new todo for the authenticated user.

**Requires**: Valid session token (in cookie), CSRF token

**Request Body**:
```json
{
  "title": "string (required, max 200 characters)",
  "description": "string (optional, max 1000 characters)",
  "completed": "boolean (optional, defaults to false)",
  "csrfToken": "string (required)"
}
```

**Success Response (201 Created)**:
```json
{
  "id": 3,
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "completed": false,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00",
  "user_id": "user-uuid"
}
```

**Validation Error Response (400 Bad Request)**:
```json
{
  "error": "Validation failed",
  "errors": {
    "title": ["Title is required"],
    "description": ["Description cannot exceed 1000 characters"]
  }
}
```

**Authentication Error Response (401 Unauthorized)**:
```json
{
  "error": "Not authenticated"
}
```

**CSRF Error Response (403 Forbidden)**:
```json
{
  "error": "Request validation failed. Please try again."
}
```

**Validation Rules**:
- Title: Required, 1-200 characters, cannot be empty or whitespace only
- Description: Optional, 0-1000 characters
- Completed: Optional, boolean, defaults to false

**Important Notes**:
- The todo is automatically associated with the authenticated user
- The created_at and updated_at timestamps are set by the server
- The user_id is set to the authenticated user's ID

**Validates**: Requirements 5.2

---

### GET /api/todos/{id}

Retrieve a specific todo by ID.

**Requires**: Valid session token (in cookie), user must own the todo

**Path Parameters**:
- `id`: Integer ID of the todo

**Success Response (200 OK)**:
```json
{
  "id": 1,
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "completed": false,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00",
  "user_id": "user-uuid"
}
```

**Authentication Error Response (401 Unauthorized)**:
```json
{
  "error": "Not authenticated"
}
```

**Access Denied Response (403 Forbidden)**:
```json
{
  "error": "You don't have permission to access this resource"
}
```

**Not Found Response (404 Not Found)**:
```json
{
  "error": "Resource not found"
}
```

**Important Notes**:
- Returns 403 Forbidden if the user does not own the todo
- Returns 404 Not Found if the todo does not exist

**Validates**: Requirements 5.4

---

### PUT /api/todos/{id}

Update an existing todo.

**Requires**: Valid session token (in cookie), CSRF token, user must own the todo

**Path Parameters**:
- `id`: Integer ID of the todo

**Request Body** (all fields optional):
```json
{
  "title": "string (max 200 characters)",
  "description": "string (max 1000 characters)",
  "completed": "boolean",
  "csrfToken": "string (required)"
}
```

**Success Response (200 OK)**:
```json
{
  "id": 1,
  "title": "Buy groceries and cook dinner",
  "description": "Milk, eggs, bread, chicken",
  "completed": true,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T14:20:00",
  "user_id": "user-uuid"
}
```

**Validation Error Response (400 Bad Request)**:
```json
{
  "error": "Validation failed",
  "errors": {
    "title": ["Title cannot be empty or whitespace only"]
  }
}
```

**Authentication Error Response (401 Unauthorized)**:
```json
{
  "error": "Not authenticated"
}
```

**Access Denied Response (403 Forbidden)**:
```json
{
  "error": "You don't have permission to modify this resource"
}
```

**Not Found Response (404 Not Found)**:
```json
{
  "error": "Resource not found"
}
```

**Important Notes**:
- Only provided fields are updated; omitted fields retain their current values
- The created_at timestamp is never modified
- The updated_at timestamp is set to the current time
- Returns 403 Forbidden if the user does not own the todo
- Returns 404 Not Found if the todo does not exist

**Validates**: Requirements 5.3

---

### DELETE /api/todos/{id}

Delete a todo.

**Requires**: Valid session token (in cookie), CSRF token, user must own the todo

**Path Parameters**:
- `id`: Integer ID of the todo

**Request Body**:
```json
{
  "csrfToken": "string (required)"
}
```

**Success Response (204 No Content)**:
Empty response body

**Authentication Error Response (401 Unauthorized)**:
```json
{
  "error": "Not authenticated"
}
```

**Access Denied Response (403 Forbidden)**:
```json
{
  "error": "You don't have permission to delete this resource"
}
```

**Not Found Response (404 Not Found)**:
```json
{
  "error": "Resource not found"
}
```

**Important Notes**:
- Returns 204 No Content on successful deletion (no response body)
- Returns 403 Forbidden if the user does not own the todo
- Returns 404 Not Found if the todo does not exist
- Deletion is permanent and cannot be undone

**Validates**: Requirements 5.5

---

## Error Responses

### Standard Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message",
  "errors": {
    "field_name": ["Specific error for this field"]
  }
}
```

### HTTP Status Codes

| Status | Meaning | Use Case |
|--------|---------|----------|
| 200 | OK | Successful GET or POST request |
| 201 | Created | Successful resource creation |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Validation error or malformed request |
| 401 | Unauthorized | Missing or invalid session token |
| 403 | Forbidden | CSRF token invalid, user lacks permission, or rate limit exceeded |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate username during signup |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Messages

| Error | HTTP Status | Meaning |
|-------|------------|---------|
| "Invalid credentials" | 401 | Username or password is incorrect |
| "Not authenticated" | 401 | Session token is missing or invalid |
| "Username already taken" | 409 | Username is already registered |
| "Too many requests. Please try again later." | 429 | Rate limit exceeded |
| "Request validation failed. Please try again." | 403 | CSRF token is missing or invalid |
| "You don't have permission to access this resource" | 403 | User does not own the resource |
| "Resource not found" | 404 | Resource does not exist |
| "Validation failed" | 400 | Request validation failed |

---

## CSRF Protection

### Overview

All state-changing requests (POST, PUT, DELETE) require a valid CSRF token to prevent cross-site request forgery attacks.

**Validates**: Requirements 11.1, 11.2, 11.3, 11.4

### CSRF Token Flow

1. **Obtain Token**: Call `GET /api/auth/csrf-token` to get a CSRF token
2. **Include Token**: Include the token in the `csrfToken` field of request body
3. **Validate**: Server validates the token before processing the request
4. **Rotate**: Server generates a new token after successful request
5. **Use New Token**: Use the new token for the next request

### CSRF Token Characteristics

- **Uniqueness**: Each session has a unique CSRF token
- **Expiration**: Tokens expire after 1 hour
- **Single-Use**: Tokens rotate after each state-changing request
- **Storage**: Tokens are sent in response body (not cookies) to prevent CSRF
- **Validation**: Server validates token on every state-changing request

### Example CSRF Flow

```
1. GET /api/auth/csrf-token
   Response: { "csrfToken": "token_abc123" }

2. POST /api/auth/login
   Body: {
     "username": "john_doe",
     "password": "password123",
     "csrfToken": "token_abc123"
   }
   Response: { "success": true, "csrfToken": "token_def456" }

3. POST /api/todos
   Body: {
     "title": "Buy groceries",
     "csrfToken": "token_def456"
   }
   Response: { "id": 1, ... }
```

---

## Rate Limiting

### Overview

Rate limiting protects authentication endpoints from brute force attacks.

**Validates**: Requirements 12.1, 12.2, 12.4

### Rate Limit Rules

#### Signup Endpoint (`POST /api/auth/signup`)
- **Limit**: 10 requests per hour per IP address
- **Response**: 429 Too Many Requests when exceeded
- **Reset**: Automatically resets after 1 hour

#### Login Endpoint (`POST /api/auth/login`)
- **Limit 1**: 5 requests per 15 minutes per IP address
- **Limit 2**: 10 requests per hour per IP address
- **Response**: 429 Too Many Requests when exceeded
- **Reset**: Automatically resets after the time window expires

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "error": "Too many requests. Please try again later."
}
```

HTTP Status: 429 Too Many Requests

### Rate Limit Tracking

- **Tracked By**: IP address (supports X-Forwarded-For header for proxied requests)
- **Endpoint**: Tracked separately per endpoint
- **Failed Attempts**: Only failed attempts count toward rate limit
- **Logging**: All rate limit triggers are logged for security monitoring

### Rate Limit Headers

The API does not currently return rate limit headers (X-RateLimit-*), but this may be added in future versions.

---

## Security Headers

### HTTPS Enforcement

All authentication endpoints require HTTPS. HTTP requests are rejected or redirected.

**Validates**: Requirements 9.3, 9.4

### Session Cookie Flags

Session cookies include the following security flags:

| Flag | Value | Purpose |
|------|-------|---------|
| HttpOnly | true | Prevents JavaScript access to session token |
| Secure | true | Transmits only over HTTPS |
| SameSite | Strict | Prevents CSRF attacks |
| Max-Age | 86400 | 24-hour session duration |
| Path | / | Available to entire application |

### CORS Configuration

CORS is configured to allow requests from the frontend domain with credentials:

- **Access-Control-Allow-Origin**: Frontend domain (e.g., https://example.com)
- **Access-Control-Allow-Credentials**: true
- **Access-Control-Allow-Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Access-Control-Allow-Headers**: Content-Type, Authorization

---

## Examples

### Complete Signup Flow

```bash
# 1. Get CSRF token
curl -X GET https://api.example.com/api/auth/csrf-token

# Response:
# {
#   "csrfToken": "token_abc123"
# }

# 2. Create account
curl -X POST https://api.example.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123",
    "csrfToken": "token_abc123"
  }'

# Response:
# {
#   "success": true,
#   "message": "Account created successfully"
# }
```

### Complete Login Flow

```bash
# 1. Get CSRF token
curl -X GET https://api.example.com/api/auth/csrf-token

# Response:
# {
#   "csrfToken": "token_abc123"
# }

# 2. Login
curl -X POST https://api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123",
    "csrfToken": "token_abc123"
  }' \
  -c cookies.txt

# Response:
# {
#   "success": true,
#   "csrfToken": "token_def456"
# }
# Sets session_token cookie in cookies.txt

# 3. Get current user
curl -X GET https://api.example.com/api/auth/me \
  -b cookies.txt

# Response:
# {
#   "user": {
#     "id": "user-uuid",
#     "username": "john_doe"
#   }
# }

# 4. Create todo
curl -X POST https://api.example.com/api/todos \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "csrfToken": "token_def456"
  }'

# Response:
# {
#   "id": 1,
#   "title": "Buy groceries",
#   "description": "Milk, eggs, bread",
#   "completed": false,
#   "created_at": "2024-01-15T10:30:00",
#   "updated_at": "2024-01-15T10:30:00",
#   "user_id": "user-uuid"
# }

# 5. Logout
curl -X POST https://api.example.com/api/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "csrfToken": "token_def456"
  }'

# Response:
# {
#   "success": true,
#   "message": "Logged out successfully"
# }
```

### Error Handling Examples

```bash
# Invalid credentials
curl -X POST https://api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "WrongPassword",
    "csrfToken": "token_abc123"
  }'

# Response (401):
# {
#   "error": "Invalid credentials"
# }

# Duplicate username
curl -X POST https://api.example.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123",
    "csrfToken": "token_abc123"
  }'

# Response (409):
# {
#   "error": "Username already taken"
# }

# Rate limit exceeded
curl -X POST https://api.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123",
    "csrfToken": "token_abc123"
  }'

# Response (429):
# {
#   "error": "Too many requests. Please try again later."
# }
```

---

## Changelog

### Version 1.0 (Initial Release)

- Authentication endpoints (signup, login, logout)
- CSRF token management
- Rate limiting on authentication endpoints
- Todo CRUD endpoints with user-scoped access
- Session management with 24-hour expiration
- Security headers and cookie flags

