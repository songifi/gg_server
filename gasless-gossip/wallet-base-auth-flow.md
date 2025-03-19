# StarkNet Wallet Authentication Flow

This document describes the wallet-based authentication flow for Gasless Gossip using StarkNet wallets.

## Overview

The wallet authentication system allows users to authenticate using their StarkNet wallets through a challenge-response mechanism. This provides a secure, passwordless authentication method that leverages cryptographic signatures.

## Authentication Flow

\`\`\`mermaid title="Authentication Flow" type="diagram"
sequenceDiagram
    participant User
    participant Client
    participant Server
    participant Wallet as StarkNet Wallet
    
    User->>Client: Initiate wallet login
    Client->>Server: Request challenge (POST /auth/wallet/challenge)
    Server->>Server: Generate random challenge
    Server->>Client: Return challenge
    Client->>Wallet: Request signature of challenge
    Wallet->>User: Prompt to sign message
    User->>Wallet: Approve signature
    Wallet->>Client: Return signature
    Client->>Server: Submit signature (POST /auth/wallet/verify)
    Server->>Server: Verify signature
    Server->>Server: Find or create user account
    Server->>Client: Return JWT token and user info
    Client->>Client: Store JWT token
    Client->>User: Show authenticated state

    Note over User, Wallet: Wallet Association Flow (for existing users)
    User->>Client: Request to associate wallet
    Client->>Wallet: Connect to wallet
    Wallet->>Client: Return wallet address
    Client->>Server: Send wallet address (POST /wallet/associate with JWT)
    Server->>Server: Verify user is authenticated
    Server->>Server: Check if wallet is already associated
    Server->>Server: Associate wallet with user account
    Server->>Client: Return success response
    Client->>User: Show confirmation
\`\`\`

This endpoint:
- Is protected by JWT authentication using `@UseGuards(AuthGuard('jwt'))`
- Uses a custom decorator `@GetUser('id')` to extract the user ID from the authenticated request
- Takes the wallet address from the request body
- Calls the user service to associate the wallet with the user
- Returns a success message

Note: The `@GetUser()` decorator is a custom decorator that extracts user information from the request. You might need to implement this decorator if it's not already available in your project:



