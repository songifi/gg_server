# Configuration Guide

This document provides detailed information about all configuration options available in the Gasless Gossip application.

## Environment Variables

### Application Configuration

| Variable   | Type   | Required | Default     | Description                                           |
| ---------- | ------ | -------- | ----------- | ----------------------------------------------------- |
| `PORT`     | number | No       | 3000        | The port number the application will listen on        |
| `NODE_ENV` | string | No       | development | Application environment (development/production/test) |

### StarkNet Configuration

| Variable                | Type   | Required | Default | Description                                            |
| ----------------------- | ------ | -------- | ------- | ------------------------------------------------------ |
| `STARKNET_PROVIDER_URL` | string | Yes      | -       | The URL of the StarkNet provider (must be a valid URI) |
| `STARKNET_NETWORK`      | string | No       | testnet | StarkNet network to connect to (mainnet/testnet)       |

### Database Configuration

| Variable       | Type   | Required | Default | Description                                                           |
| -------------- | ------ | -------- | ------- | --------------------------------------------------------------------- |
| `MONGODB_URI`  | string | Yes      | -       | MongoDB connection URI (must start with mongodb:// or mongodb+srv://) |
| `MONGODB_NAME` | string | Yes      | -       | Name of the MongoDB database                                          |

### JWT Configuration

| Variable         | Type   | Required | Default | Description                                          |
| ---------------- | ------ | -------- | ------- | ---------------------------------------------------- |
| `JWT_SECRET`     | string | Yes      | -       | Secret key for JWT token generation (min 32 chars)   |
| `JWT_EXPIRES_IN` | string | No       | 7d      | JWT token expiration time (format: number + s/m/h/d) |

## Environment-Specific Configuration

### Development (.env.development)

```env
NODE_ENV=development
PORT=3000
STARKNET_NETWORK=testnet
```

### Production (.env.production)

```env
NODE_ENV=production
PORT=8080
STARKNET_NETWORK=mainnet
JWT_SECRET=<strong-production-secret>
```

### Test (.env.test)

```env
NODE_ENV=test
PORT=3001
STARKNET_NETWORK=testnet
```

## Security Considerations

1. **JWT_SECRET**:

   - Must be at least 32 characters long
   - Should be unique for each environment
   - Never commit production secrets to version control

2. **MongoDB URI**:

   - Use connection string with authentication
   - Different credentials for each environment
   - Consider using MongoDB Atlas for production

3. **Environment Files**:
   - Never commit `.env` files to version control
   - Keep production secrets in secure key management systems
   - Use different values for development, testing, and production

## Validation

All configuration values are validated on application startup:

- Required fields must be present
- Values must match their expected formats
- JWT secret length is validated (warns if < 32 chars)
- MongoDB URI format is validated
- Environment value must be valid

## Usage Example

```typescript
// Inject the ConfigService
constructor(private configService: ConfigService) {}

// Access configuration values
const port = this.configService.app.port;
const mongoUri = this.configService.database.uri;
const isProduction = this.configService.isProduction;
```
