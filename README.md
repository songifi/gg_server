# Gasless Gossip Backend

Gasless Gossip is an on-chain chat application that enables users to send and receive messages along with tokens without gas fees. This backend is built using **NestJS** and **MongoDB**, providing a scalable and efficient API for the application.

## 🚀 Features
- **User Authentication & Authorization** (JWT-based)
- **Real-time Chat** using WebSockets
- **On-chain Transaction Integration**
- **Message Encryption & Security**
- **MongoDB Database with Mongoose ODM**
- **Modular & Scalable NestJS Architecture**

## 🛠 Tech Stack
- **Framework:** [NestJS](https://nestjs.com/)
- **Database:** [MongoDB](https://www.mongodb.com/)
- **WebSockets:** Built-in NestJS Gateway
- **Blockchain:** Starknet Integration (Planned)
- **Authentication:** JWT-based authentication
- **Environment Management:** dotenv

## 📂 Project Structure
```
📦 gasless-gossip-backend
 ┣ 📂 src
 ┃ ┣ 📂 auth       # Authentication & Authorization
 ┃ ┣ 📂 chat       # Chat module (WebSockets & Messaging)
 ┃ ┣ 📂 users      # User management
 ┃ ┣ 📂 common     # Shared utilities & DTOs
 ┃ ┣ 📂 config     # Configurations
 ┃ ┣ 📂 database   # MongoDB connection setup
 ┃ ┣ 📜 main.ts    # Entry point
 ┃ ┗ ...
 ┣ 📜 .env.example # Environment variables template
 ┣ 📜 README.md    # Project documentation
 ┗ 📜 package.json # Dependencies
```

## 🏗 Installation & Setup
### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-repo/gasless-gossip-backend.git
cd gasless-gossip-backend
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Configure Environment Variables
Copy the `.env.example` file and create a `.env` file:
```bash
cp .env.example .env
```
Then, update the required environment variables.

### 4️⃣ Start the Server
#### Development Mode
```bash
npm run start:dev
```
#### Production Mode
```bash
npm run build
npm run start:prod
```

## 🔗 API Endpoints
| Method | Endpoint         | Description             |
|--------|----------------|-------------------------|
| POST   | /auth/signup   | Register a new user    |
| POST   | /auth/login    | Authenticate user      |
| GET    | /users/:id     | Get user details       |
| GET    | /chat/messages | Fetch chat messages    |
| POST   | /chat/send     | Send a new message     |

## 🧪 Testing
Run unit tests using:
```bash
npm run test
```
Run end-to-end (e2e) tests:
```bash
npm run test:e2e
```

## 🤝 Contribution
1. Fork the repository.
2. Create a new feature branch: `git checkout -b feature-branch`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature-branch`
5. Open a Pull Request.

// Security documentation for authentication:
/*
# Authentication Security Requirements
## Password Requirements
 **Length**: Passwords must be 8-32 characters long
 **Complexity**: Passwords must include:
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number OR one special character
 **Prohibited Content**:
   - Common words or patterns (e.g., "password", "123456", "qwerty")
   - Sequential characters (e.g., "abc", "123")
   - Repetitive characters (e.g., "aaa", "111")

## Password Management
 **History**: System prevents reuse of the last 5 passwords
 **Expiration**: Passwords expire after 90 days
 **Reset Process**: Secure password reset via email with time-limited tokens
 **Storage**: Passwords are never stored in plain text, only as bcrypt hashes

## Implementation Details
 **Validation**: All password validation occurs on both client and server
 **Feedback**: Specific feedback provided on failed validation
 **Security Events**: Failed password attempts are logged and monitored
 **Lockout Policy**: Accounts are temporarily locked after 5 failed attempts

## Recommended Password Practices (User Documentation)
- Use a passphrase of multiple words with spaces or special characters
- Avoid using personal information in passwords
- Use different passwords for different services
- Consider using a password manager
## Password Storage
- Passwords are hashed using bcrypt with appropriate salt rounds
- Plain text passwords are never stored in the database
- Password validation enforces complexity requirements

## JWT Implementation
- Access tokens are short-lived (15 minutes)
- Refresh tokens are long-lived (7 days) but can be revoked
- JWT secrets are stored in environment variables, not in code
- All tokens have proper expiration timestamps

## API Security
- Authentication endpoints follow RESTful practices
- Sensitive operations require authentication via JWT
- Validation is applied to all input data
- CORS is enabled to restrict cross-origin requests

## Refresh Token Security
- Refresh tokens are stored hashed in the database
- Each refresh token is unique and can only be used once
- Refresh tokens are invalidated on logout
- Expired tokens are automatically invalidated

## Security Headers
- Implement appropriate security headers in production:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy: appropriate policies
  - Strict-Transport-Security: max-age=31536000; includeSubDomains

## Additional Security Measures
- Implement rate limiting for authentication endpoints
- Add brute force protection (e.g., temporary account lockout)
- Implement IP-based or device-based suspicious activity detection
- Set up audit logging for authentication events
*/