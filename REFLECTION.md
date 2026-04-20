## Q1 — Middleware

In Express, middleware refers to functions that execute during the request-response cycle. They sit between the initial request and the final route handler, and each has access to the request (`req`), response (`res`), and a `next()` function to pass control to the subsequent middleware.

The order of registration is critical because Express processes them sequentially. For instance, `app.use(express.json())` must be registered before any routes that need to parse a JSON request body. If it were placed after, `req.body` would be `undefined` in those routes.

There's a key difference between global and route-level middleware:
*   **Global middleware**, like `app.use(cors())`, is applied to every single incoming request, regardless of its path or method. It's used for broad, application-wide concerns like enabling cross-origin requests or parsing bodies.
*   **Route-level middleware**, like `verifyToken` in `app.post('/api/scores', verifyToken, ...)`, is applied only to a specific route. This is ideal for targeted logic like authentication, ensuring that only designated endpoints are protected while others remain public.

## Q2 — Password Security

Passwords must never be stored in plain text because if the database is ever compromised, an attacker would gain access to every user's exact password. Since many people reuse passwords across different services, this could lead to a catastrophic breach of their other accounts.

The `bcrypt.hash(password, 10)` function mitigates this risk. It takes the plain-text password and combines it with a randomly generated "salt." This combination is then put through a one-way hashing algorithm. The number `10` represents the "cost factor" or "salt rounds," which dictates how many times the hashing computation is performed (2^10 times). A higher number makes the hash more resistant to brute-force attacks but takes longer to compute.

`bcrypt.compare()` works without reversing the hash. When a user logs in, the function takes their submitted plain-text password and the full hash string from the database. It extracts the original salt from that hash string, re-hashes the submitted password using that same salt, and then compares the result to the hash stored in the database. If they match, the password is valid.

## Q3 — JWT Flow

The authentication flow in QuizBlitz is a three-step process:

1.  **Registration:** The client sends a `POST` request to `/api/auth/register` with an email and password. The server validates the data, hashes the password with bcrypt, and saves a new `User` document to MongoDB. It then returns a `201 Created` status with the new user's ID and email.

2.  **Login:** The client sends a `POST` to `/api/auth/login` with an email and password. The server finds the user by email and uses `bcrypt.compare()` to verify the password. If successful, it generates a JSON Web Token (JWT). Embedded in this token's payload is non-sensitive data: the user's ID and email (`{ userId, email }`). The server signs this payload with its secret key and returns the token to the client.

3.  **Score Submission:** To submit a score, the client sends a `POST` to the protected `/api/scores` route, including the JWT in the `Authorization: Bearer <token>` header. The `verifyToken` middleware intercepts this. It verifies the token's signature using the server's secret key. Because only the server knows the secret, a valid signature proves the payload hasn't been tampered with. The server can therefore trust the `userId` and `email` within the token payload without needing to perform another database lookup, and it uses this data to create the new score document.

## Q4 — In-Memory vs Database

Using an in-memory `let scores = []` array presented two significant problems that a database solves:

1.  **Lack of Persistence:** The most immediate issue is that the array's contents are volatile. Every time the server restarted—whether due to a code change, a crash, or a manual reboot—the array was wiped clean, and all submitted scores were permanently lost.

2.  **No Scalability:** While not an issue for this project, in a production environment with multiple server instances, each instance would have its own separate in-memory array. A score submitted to one server would not appear on the leaderboard fetched from another, leading to inconsistent and fragmented data.

When I redeploy the server to Railway, the data in MongoDB is completely unaffected. This is because MongoDB Atlas is a separate, persistent service. The server is ephemeral, but the database is permanent. The new server instance simply establishes a new connection to the existing database, which still holds all the previously saved scores. This is the fundamental advantage of decoupling the application logic from the data storage.

## Q5 — Route Design Decision

The decision to make `GET /api/scores` public and `POST /api/scores` protected is a sensible design choice that balances user experience with security.

A public leaderboard is a core feature that drives engagement. Any visitor, whether logged in or not, should be able to see the high scores to understand the competitive aspect of the game. Making the `GET` route public allows the `LeaderboardView` to function for everyone, encouraging new users to register and play.

Conversely, the `POST` route must be protected to ensure data integrity. Requiring a valid JWT guarantees that every submitted score is tied to a real, authenticated user. This prevents anonymous spam, cheating, and ensures that the `playerName` on the leaderboard is a verified identity (the user's email) rather than an arbitrary string.

If `GET /api/scores` also required authentication, the user experience would be significantly degraded. A potential player couldn't see the leaderboard without first creating an account, which creates a barrier to entry. The `LeaderboardView` component would fail for all non-logged-in users, forcing them to a login screen instead of showing them one of the game's main attractions.
