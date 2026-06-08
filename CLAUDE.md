# API Automation Framework Instructions

## Project Purpose

This project is a TypeScript + Playwright Test based API automation framework.

The framework must be simple, extensible, maintainable, and suitable for different backend projects.

The main purpose is API test automation. Database access is used only when API results need to be verified against persisted data.

This project must avoid unnecessary complexity and must not introduce Java-style POJO, DTO, model class, or response interface structures.

API responses must be handled directly as plain JSON.

---

## Core Technology Decisions

Use the following stack:

- Language: TypeScript
- Test Framework: Playwright Test
- HTTP Client: Playwright APIRequestContext
- Assertion Library: Playwright expect
- Database: PostgreSQL
- Database Client: pg
- ORM: Not allowed

Do not use:

- Prisma
- TypeORM
- Sequelize
- postman-request
- callback-based request libraries
- POJO structures
- DTO structures
- response model classes
- response interfaces for API bodies

---

## High-Level Architecture

The project must follow this conceptual structure:

- src/clients
  - Domain-based API clients
  - Responsible only for sending API requests

- src/config
  - Environment config
  - Endpoint config
  - Database config

- src/database
  - Database verification layer
  - Central database client
  - Domain-based repositories
  - SQL query definitions

- src/utils
  - Generic reusable helpers
  - Generic assertions
  - Token/auth helpers
  - Response helpers

- tests
  - Playwright test files
  - Business assertions
  - API response checks
  - Optional API-to-database verification

The contents of clients and tests are dynamic. Do not assume fixed modules such as product, basket, order, payment, or campaign. Domain files must be created according to the actual backend project.

---

## Response Handling Rules

API responses must be read directly as JSON.

Do not wrap response bodies with:

- classes
- DTOs
- POJOs
- response models
- response interfaces
- unnecessary response type aliases

Nested JSON should be handled using normal JavaScript object access. Use readable intermediate variables when the response structure is deep.

The framework should stay simple and avoid over-abstraction.

---

## API Client Layer Rules

API clients must live under src/clients.

Each API client must represent one backend domain or logical API area.

API clients are responsible only for:

- sending HTTP requests
- using Playwright APIRequestContext
- using endpoint paths from the centralized endpoint config
- returning APIResponse objects

API clients must not:

- perform assertions
- query the database
- contain business validation logic
- hardcode full URLs
- manage raw credentials
- duplicate token logic

The test layer decides whether a response is valid.

---

## Endpoint Management Rules

All endpoint paths must be centralized under src/config/endpoints.ts.

Tests must not contain hardcoded full URLs.

Dynamic endpoints must be represented in a maintainable way.

When a new domain is added, endpoint definitions must be added before creating the client methods.

---

## Environment Management Rules

Environment values must be read through config files.

Use dedicated config files for:

- application environment values
- base URL
- database configuration
- authentication-related configuration

Tests must not directly read process.env.

Real credentials must never be hardcoded.

.env.example must contain only safe sample values.

---

## Database Verification Purpose

This project does not write SQL tests.

The database is not tested directly.

Database access exists only to support API test verification.

Use the database only for:

- getting expected data and comparing it with API response
- verifying that POST operations persisted data
- verifying that PUT/PATCH operations updated data
- verifying that DELETE operations removed, deactivated, or changed data as expected

Use correct terminology:

- database verification
- database validation
- API response database verification

Avoid terminology such as:

- SQL test
- DB test
- database testing

---

## Database Layer Rules

Database files must live under src/database.

The database layer must include:

- a central database client
- domain-based repositories
- SQL query definition files

Database client responsibilities:

- use pg
- use connection pooling
- manage database access centrally
- expose a reusable query execution function
- expose a safe way to close the pool when needed

Query rules:

- SQL statements must be kept outside test files
- SQL statements must be placed in query definition files
- tests must never contain raw SQL

Repository rules:

- repositories must provide domain-specific database access methods
- repositories must call the central database client
- repositories must use SQL from query definition files
- repositories must return raw database rows or useful plain objects
- repositories must not perform API requests
- repositories must not contain Playwright request logic
- repositories must not perform business assertions

---

## Test Layer Rules

Test files must live under tests.

Tests are responsible for business validation.

Tests may call:

- API clients
- database repositories
- generic assertion helpers
- token/auth helpers

Tests must:

- check response status
- read response body as plain JSON
- validate important response fields
- compare API response with database result when needed
- remain independent from each other
- be safe for parallel execution where possible

Tests must not:

- create raw database connections
- write raw SQL
- hardcode full URLs
- repeat token or header logic
- use POJO/DTO/model class structures
- put assertion logic inside API clients

---

## API and Database Verification Flow

For GET-style verification:

1. Get expected data from the database through a repository when needed.
2. Call the API through a client.
3. Check the response status.
4. Read the response body as plain JSON.
5. Compare relevant API response fields with database values.

For POST-style verification:

1. Create data through the API.
2. Check the response status.
3. Read the response body as plain JSON.
4. Use the response identifier to query the database through a repository.
5. Verify the record exists in the database.
6. Compare relevant API response fields with database values.

For PUT/PATCH-style verification:

1. Update data through the API.
2. Check the response status.
3. Read the response body as plain JSON.
4. Query the updated record from the database.
5. Verify updated fields match expected values and the API response.

For DELETE-style verification:

1. Delete or deactivate data through the API.
2. Check the response status.
3. Query the database by identifier.
4. Verify the record is deleted, deactivated, or changed according to backend behavior.

---

## Authentication and Token Rules

Authentication logic must not be repeated across tests.

Token management should be centralized under src/utils/tokenManager.ts or an equivalent utility.

Token helper responsibilities may include:

- requesting tokens
- caching tokens
- refreshing tokens if needed
- returning reusable authorization headers

Tests should call token helpers instead of manually building headers repeatedly.

---

## Utility Rules

Generic helpers must live under src/utils.

Useful helper areas include:

- generic assertions
- response helpers
- token management
- data formatting helpers

Generic assertion helpers must stay generic.

Domain-specific assertion helpers may be added only when they improve readability, but they must not introduce POJO, DTO, or model structures.

---

## Playwright Configuration Rules

playwright.config.ts must keep API test setup simple.

It should define:

- tests directory
- base URL configuration
- useful reporters
- retry strategy if needed
- default API headers when appropriate

The config should not become a place for business logic.

---

## Package Script Rules

package.json should include useful scripts for:

- running all tests
- running API tests
- opening the report

Additional scripts may be added when they improve daily usage or CI integration.

---

## Coding Standards

Use:

- TypeScript
- async/await
- Playwright expect
- Playwright APIRequestContext
- pg Pool
- repository pattern for database verification
- centralized endpoint management
- centralized environment config

Avoid:

- callback-based request code
- hardcoded credentials
- hardcoded full URLs in tests
- raw SQL in tests
- database connections in tests
- assertions inside API clients
- API calls inside database repositories
- database queries inside API clients
- unnecessary abstraction
- POJO, DTO, model, or response interface structures

---

## Responsibility Separation

API client responsibilities:

- send API requests
- return API responses

API clients must not:

- assert
- query database
- validate business behavior

Database repository responsibilities:

- execute database queries
- return database records

Database repositories must not:

- call APIs
- use Playwright request
- perform business assertions

Test file responsibilities:

- call API clients
- call repositories when needed
- check status code
- read JSON response body
- compare API response with database result
- perform business assertions

---

## Adding a New Domain

When adding a new domain:

1. Add endpoint definitions.
2. Create the domain API client.
3. Add database query definitions only if database verification is needed.
4. Add repository methods only if database verification is needed.
5. Create the related test file or business-flow test file.

Do not assume every domain needs database verification.

Use database verification only when it adds real value to the API test.

---

## Test Design Guidance

Not every API test needs database verification.

Use API-only tests for:

- basic status checks
- simple response validation
- public lookup endpoints
- list endpoints
- lightweight smoke tests

Use API plus database verification for:

- critical business flows
- create operations
- update operations
- delete/deactivation operations
- payment, order, basket, user, or state-changing flows
- cases where response validation alone is not enough

---

## Final Checklist Before Completing Any Task

Before finishing any change, verify:

- no POJO, DTO, or model class was added
- no response interface was added for API bodies
- no unnecessary response type alias was added
- no raw SQL exists in test files
- no database connection exists in test files
- no assertion exists inside API clients
- no API request exists inside database repositories
- no database query exists inside API clients
- no hardcoded full URL exists in tests
- no credential is hardcoded
- response body is read as plain JSON
- clients return APIResponse
- tests perform business assertions
- database is used only for API result verification
