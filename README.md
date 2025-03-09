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