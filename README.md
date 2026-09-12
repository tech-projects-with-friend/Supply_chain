# TraceChain — Blockchain-Based Supply Chain Management & Traceability System

**Course:** Blockchain Architecture (Slot 1) — VIT Chennai  
**Team:** Amey Anil Bondre (25BCE1763) · Om Pravin Thavari (25BCE5180)  
**Stack:** Solidity · Hardhat · Ethers.js v6 · Express.js · MongoDB · Next.js 16

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Smart Contract Security Design](#4-smart-contract-security-design)
5. [Express API Reference](#5-express-api-reference)
6. [Data Architecture — On-Chain vs Off-Chain](#6-data-architecture--on-chain-vs-off-chain)
7. [Prerequisites & Installation](#7-prerequisites--installation)
8. [Running the Automated Test Suite](#8-running-the-automated-test-suite)
9. [Starting the Full Application](#9-starting-the-full-application)
10. [Live Demo Walkthrough](#10-live-demo-walkthrough)
11. [SDG Alignment](#11-sdg-alignment)

---

## 1. Project Overview

TraceChain is a blockchain-based supply chain tracking and product-verification platform that records every lifecycle event — from manufacturing to sale and optional return — on an immutable Ethereum-compatible ledger.

### Product Lifecycle — Forward Chain

```
MANUFACTURED → CERTIFIED → IN_TRANSIT → DISTRIBUTOR_RECEIVED → IN_TRANSIT → RETAILER_RECEIVED → SOLD
```

### Product Lifecycle — Reverse Chain (Returns)

```
SOLD → RETURN_REQUESTED → RETURNED_TO_RETAILER → RETURN_IN_TRANSIT → DISTRIBUTOR_RETURN_RECEIVED
     → RETURN_IN_TRANSIT → MANUFACTURER_RETURN_RECEIVED → { RESTOCKED | REFURBISHED | DAMAGED | DISPOSED }
```

Refurbished and restocked products re-enter the forward chain seamlessly, creating a verifiable circular lifecycle.

### Key Features

| Feature | Description |
|---|---|
| **16-State Lifecycle** | Covers forward supply chain, sale, return flow, inspection, and terminal dispositions |
| **6-Role RBAC** | Admin, Manufacturer, Certifier, Distributor, Retailer, Customer |
| **Immutable Audit Trail** | Every state transition appends a timestamped `HistoryEntry` struct on-chain |
| **Transfer Routing** | Smart contract enforces Manufacturer→Distributor→Retailer flow |
| **QR Code Verification** | Frontend generates scannable QR codes per product for instant verification |
| **Hybrid Storage** | Critical lifecycle data on-chain; rich metadata (descriptions, images) in MongoDB |
| **78 Automated Tests** | Complete test coverage of every modifier, state transition, and revert condition |

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Dashboard    │  │  Product     │  │  QR Code Generator    │  │
│  │  (page.tsx)   │  │  Registration│  │  (qrcode.react)       │  │
│  └──────────────┘  └──────────────┘  └───────────────────────┘  │
│                         ▼ HTTP (Port 3000)                       │
└──────────────────────────────────────────────────────────────────┘
                          │
                          │ REST API (JSON)
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express.js + TypeScript)             │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  │
│  │  server.ts    │  │  productRoutes.ts                        │  │
│  │  (Port 5000)  │  │  POST /register · GET /:id · POST /certify│ │
│  │              │  │  POST /transfer · POST /receive · POST /sell│ │
│  └──────────────┘  └──────────────────────────────────────────┘  │
│          │                            │                          │
│          ▼                            ▼                          │
│  ┌──────────────┐           ┌──────────────────┐                │
│  │  MongoDB      │           │  Ethers.js v6     │                │
│  │  (Off-chain)  │           │  (blockchain.ts)  │                │
│  └──────────────┘           └──────────────────┘                │
│                                       │                          │
└───────────────────────────────────────┼──────────────────────────┘
                                        │ JSON-RPC (Port 8545)
                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                  BLOCKCHAIN (Hardhat EVM Local Node)              │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    TraceChain.sol                             ││
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  ││
│  │  │ RBAC System  │  │ Product State│  │ HistoryEntry[]     │  ││
│  │  │ (6 Roles)    │  │ Machine      │  │ (Immutable Audit)  │  ││
│  │  └─────────────┘  │ (16 States)  │  └───────────────────┘  ││
│  │                    └──────────────┘                          ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### Communication Flow

1. **User** interacts with the **Next.js frontend** (port 3000).
2. Frontend sends REST API calls to the **Express backend** (port 5000).
3. Backend uses **Ethers.js v6** to invoke smart contract functions via JSON-RPC on **Hardhat node** (port 8545).
4. **Blockchain transactions** are confirmed and the backend returns the `txHash` to the frontend.
5. **MongoDB** (optional) stores rich metadata that does not belong on-chain.

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Blockchain** | Hardhat | 2.29.x | Local EVM node, compilation, testing, deployment |
| **Smart Contract** | Solidity | 0.8.28 | On-chain business logic, RBAC, state machine |
| **Contract Testing** | Chai + Mocha | via Hardhat Toolbox | Automated test assertions |
| **Backend** | Express.js | 5.x | REST API server |
| **Blockchain Bridge** | Ethers.js | 6.17.x | Contract interaction from Node.js |
| **Off-Chain DB** | MongoDB + Mongoose | 9.x | Product metadata persistence |
| **Frontend** | Next.js + React | 16.3.x / 19.x | Dashboard UI, SSR |
| **QR Generation** | qrcode.react | latest | Product verification QR codes |
| **Language** | TypeScript | 5.x / 7.x | Type safety across all layers |

---

## 4. Smart Contract Security Design

### 4.1 Role-Based Access Control (RBAC)

The contract implements a 6-role access control system via address-to-boolean mappings:

```solidity
mapping(address => bool) public admins;
mapping(address => bool) public manufacturers;
mapping(address => bool) public certifiers;
mapping(address => bool) public distributors;
mapping(address => bool) public retailers;
address public owner;  // immutable deployer — cannot be removed as admin
```

**Enforcement mechanism:** Every state-mutating function checks the caller's role before executing. The `onlyAdmin` Solidity modifier protects all role-management functions.

### 4.2 Access Control Matrix

| Function | Required Role | Additional Guard |
|---|---|---|
| `addManufacturer` / `removeManufacturer` | Admin | — |
| `addCertifier` / `addDistributor` / `addRetailer` | Admin | — |
| `addAdmin` / `removeAdmin` | Admin | Cannot remove contract `owner` |
| `registerProduct` | Manufacturer | Product must not already exist |
| `certifyProduct` | Certifier | Status must be `MANUFACTURED` |
| `transferProduct` | Current Owner | Status must be transferable; receiver role enforced |
| `receiveProduct` | Expected Receiver | Status must be `IN_TRANSIT` |
| `sellProduct` | Retailer + Current Owner | Status must be `RETAILER_RECEIVED` |
| `requestReturn` | Any (customer) | Status must be `SOLD` + `returnEligible` |
| `acceptReturn` | Retailer | Status must be `RETURN_REQUESTED` |
| `transferReturn` | Current Owner | Status must be returnable |
| `receiveReturn` | Expected Receiver | Status must be `RETURN_IN_TRANSIT` |
| `inspectAndResolve` | Manufacturer | Status must be `MANUFACTURER_RETURN_RECEIVED` |

### 4.3 Transfer Routing Enforcement

The `transferProduct` function enforces directional supply chain flow:

```
┌─────────────────────┐     ┌─────────────────────┐     ┌────────────────────┐
│     Manufacturer     │ ──▸ │     Distributor      │ ──▸ │      Retailer      │
│  (CERTIFIED product) │     │ (DIST_RECEIVED prod) │     │  (Sells to customer)│
└─────────────────────┘     └─────────────────────┘     └────────────────────┘
```

- A **CERTIFIED** product can only be transferred to an authorised **Distributor**.
- A **DISTRIBUTOR_RECEIVED** product can only be transferred to an authorised **Retailer**.
- Any violation triggers a revert with a specific error message.

### 4.4 State Machine — 16 Statuses

```solidity
enum ProductStatus {
    MANUFACTURED,                // 0  — Registered by manufacturer
    CERTIFIED,                   // 1  — Approved by certifier
    IN_TRANSIT,                  // 2  — Shipped (forward chain)
    DISTRIBUTOR_RECEIVED,        // 3  — Confirmed by distributor
    RETAILER_RECEIVED,           // 4  — Confirmed by retailer
    SOLD,                        // 5  — Sold to customer
    RETURN_REQUESTED,            // 6  — Customer initiated return
    RETURNED_TO_RETAILER,        // 7  — Retailer accepted return
    RETURN_IN_TRANSIT,           // 8  — Shipped backward
    DISTRIBUTOR_RETURN_RECEIVED, // 9  — Distributor received return
    MANUFACTURER_RETURN_RECEIVED,// 10 — Manufacturer received return
    INSPECTED,                   // 11 — (Unused — event-only marker)
    RESTOCKED,                   // 12 — Inspection: like-new, restocked
    REFURBISHED,                 // 13 — Inspection: repaired
    DAMAGED,                     // 14 — Inspection: damaged (terminal)
    DISPOSED                     // 15 — Inspection: disposed (terminal)
}
```

### 4.5 Immutable Audit Trail

Every state transition appends a `HistoryEntry` struct to an on-chain array:

```solidity
struct HistoryEntry {
    string   action;    // e.g. "PRODUCT_CREATED", "PRODUCT_TRANSFERRED"
    address  actor;     // wallet that triggered the transition
    address  from;      // sender (for transfers)
    address  to;        // receiver (for transfers)
    uint256  timestamp; // block.timestamp at the time of recording
}
```

This array is append-only — entries can never be modified or deleted, guaranteeing a tamper-proof provenance record.

### 4.6 Events Emitted

| Event | Trigger |
|---|---|
| `ProductCreated(productId, manufacturer)` | Product registration |
| `ProductCertified(productId, certifier)` | Quality certification |
| `ProductTransferred(productId, from, to)` | Ownership transfer initiated |
| `ProductReceived(productId, receiver)` | Receipt confirmed |
| `ProductSold(productId, retailer)` | Sale finalised |
| `RoleGranted(role, account)` | New role assigned |
| `RoleRevoked(role, account)` | Role removed |
| `ReturnRequested(productId)` | Return initiated by customer |
| `ReturnAccepted(productId, retailer)` | Retailer accepts return |
| `ProductInspected(productId)` | Manufacturer begins inspection |
| `ProductRestocked(productId)` | Outcome: restocked as-new |
| `ProductRefurbished(productId)` | Outcome: refurbished |
| `ProductDamaged(productId)` | Outcome: marked damaged |
| `ProductDisposed(productId)` | Outcome: disposed |

---

## 5. Express API Reference

**Base URL:** `http://localhost:5000/api`

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/health` | Health check | — |
| `GET` | `/blockchain/status` | Blockchain node connectivity | — |
| `POST` | `/products/setup` | Grant manufacturer role to backend wallet | — |
| `POST` | `/products/register` | Register a new product on-chain + MongoDB | `{ productId, name, category, batchId, manufacturingDate, expiryDate, manufacturingLocation, returnEligible, returnPeriod, description?, imageUrl?, additionalNotes? }` |
| `GET` | `/products/:id` | Fetch product (on-chain details + history + off-chain metadata) | — |
| `POST` | `/products/:id/certify` | Certify product | — |
| `POST` | `/products/:id/transfer` | Transfer product to receiver | `{ receiverAddress }` |
| `POST` | `/products/:id/receive` | Confirm product receipt | — |
| `POST` | `/products/:id/sell` | Mark product as sold | — |

### Response Format

All successful write operations return:
```json
{
  "success": true,
  "txHash": "0x...",
  "message": "Product certified successfully!"
}
```

The `GET /products/:id` endpoint returns a hybrid payload:
```json
{
  "onChain": {
    "details": [ /* Product struct fields as array */ ],
    "history": [ /* HistoryEntry structs as arrays */ ]
  },
  "offChain": {
    "description": "...",
    "imageUrl": "...",
    "additionalNotes": "..."
  }
}
```

---

## 6. Data Architecture — On-Chain vs Off-Chain

### On-Chain (Ethereum / Hardhat EVM)

| Data | Storage | Rationale |
|---|---|---|
| Product identity (ID, name, batch, category) | `Product` struct | Core identity must be tamper-proof |
| Lifecycle status & condition | `Product` struct | State transitions are the contract's primary function |
| Ownership chain | `currentOwner`, `expectedReceiver` | Provenance must be trustless |
| Audit trail | `HistoryEntry[]` | Immutable, append-only log |
| Manufacturing & expiry dates | `Product` struct | Verifiable timestamps |
| Role assignments | Role mappings | On-chain enforcement |

### Off-Chain (MongoDB via Mongoose)

| Data | Collection | Rationale |
|---|---|---|
| Product description | `ProductMeta` | Rich text, not needed for trust |
| Image URLs | `ProductMeta` | Too large for blockchain storage |
| Additional notes | `ProductMeta` | Supplementary, mutable metadata |
| User profiles | `User` | App-layer convenience |

MongoDB is optional — the backend starts gracefully without it, and all blockchain operations continue to function.

---

## 7. Prerequisites & Installation

### System Requirements

- **Node.js** ≥ 18.x (LTS recommended)
- **npm** ≥ 9.x
- **MongoDB** (optional — for off-chain metadata)
- **Git**

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone <repo-url> tracechain
cd tracechain

# 2. Install blockchain dependencies and compile
cd blockchain
npm install
npx hardhat compile

# 3. Install backend dependencies
cd ../backend
npm install

# 4. Install frontend dependencies
cd ../frontend
npm install
```

### Environment Configuration

The backend requires a `.env` file at `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/tracechain
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

> **Note:** The `PRIVATE_KEY` above is Hardhat's default Account #0 — it is a well-known test key and must **never** be used on a mainnet.

---

## 8. Running the Automated Test Suite

The test suite comprises **78 test cases** covering every role, modifier, state transition, revert condition, and edge case in the smart contract.

### Execute Tests

```bash
cd blockchain
npx hardhat test
```

### Expected Output

```
  TraceChain
    Deployment
      ✓ should deploy successfully and set deployer as admin
    Role Management
      ✓ should allow admin to grant manufacturer role
      ✓ should allow admin to grant certifier role
      ✓ should allow admin to grant distributor role
      ✓ should allow admin to grant retailer role
      ✓ should emit RoleGranted event when adding a role
      ✓ should allow admin to revoke a role
      ✓ should emit RoleRevoked event when removing a role
      ✓ should reject role assignment by non-admin
      ✓ should reject role revocation by non-admin
      ✓ should allow admin to add another admin
      ✓ should prevent removing the contract owner as admin
    Product Registration
      ✓ should allow a manufacturer to register a product
      ✓ should record a history entry on registration
      ✓ should register a non-returnable product
      ✓ should reject duplicate product registration
      ✓ should reject registration by a non-manufacturer
      ✓ should reject registration by a certifier
      ✓ should reject registration by a retailer
      ✓ should reject registration by an unauthorized address
    Product Certification
      ✓ should allow a certifier to certify a manufactured product
      ✓ should record a history entry on certification
      ✓ should reject certification by a non-certifier
      ✓ should reject certification of a non-existent product
      ✓ should reject certification of an already certified product
      ✓ should reject certification of a product in IN_TRANSIT status
    Product Transfer
      ✓ should allow manufacturer to transfer certified product to distributor
      ✓ should allow distributor to transfer received product to retailer
      ✓ should reject transfer before certification
      ✓ should reject transfer by non-owner
      ✓ should reject transfer of certified product to a retailer directly
      ✓ should reject transfer of distributor-received product to another distributor
      ✓ should reject transfer to an unauthorized address
      ✓ should reject transfer of non-existent product
      ✓ should reject distributor transferring before receiving
      ✓ should record history entry on transfer
    Product Receiving
      ✓ should allow distributor to receive an in-transit product
      ✓ should allow retailer to receive an in-transit product
      ✓ should reject receive by wrong receiver
      ✓ should reject receive when product is not in transit
      ✓ should reject receive by an unauthorized address
      ✓ should record history entry on receive
    Product Sale
      ✓ should allow retailer to sell a received product
      ✓ should reject sale by non-retailer
      ✓ should reject sale by retailer who is not current owner
      ✓ should reject sale when product is not in RETAILER_RECEIVED status
      ✓ should reject sale of product still at distributor
      ✓ should record history entry on sale
    Full Forward Supply Chain Lifecycle
      ✓ should transition from MANUFACTURED to SOLD through all states
      ✓ should accumulate a complete history through the forward chain
    View Functions
      ✓ should return product via getProduct
      ✓ should return history via getHistory
      ✓ should return both product and history via verifyProduct
      ✓ should revert getProduct for non-existent product
      ✓ should revert getHistory for non-existent product
      ✓ should revert verifyProduct for non-existent product
    Invalid State Transitions
      ✓ should reject selling a manufactured product
      ✓ should reject transferring a sold product
      ✓ should reject certifying a sold product
      ✓ should reject receiving a product that is not in transit
    Return Flow - Request
      ✓ should allow return request on a sold returnable product
      ✓ should reject return request on a non-returnable product
      ✓ should reject return request on a product not yet sold
      ✓ should reject return request for a non-existent product
    Return Flow - Accept and Reverse Chain
      ✓ should allow retailer to accept a return
      ✓ should reject accept return by non-retailer
      ✓ should complete the full reverse supply chain
    Inspection and Resolution
      ✓ should allow manufacturer to inspect and restock
      ✓ should allow manufacturer to inspect and refurbish
      ✓ should allow manufacturer to inspect and mark damaged
      ✓ should allow manufacturer to inspect and dispose
      ✓ should reject inspection by non-manufacturer
      ✓ should reject inspection of product not in MANUFACTURER_RETURN_RECEIVED status
      ✓ should reject invalid inspection outcome
      ✓ should preserve complete history after inspection
    Refurbished Product Re-entry
      ✓ should allow a refurbished product to re-enter the forward supply chain
    History Immutability
      ✓ should only grow the history array and never shrink it
      ✓ should include all timestamps in chronological order

  78 passing (4s)
```

### Test Coverage Breakdown

| Category | Tests | What Is Validated |
|---|---|---|
| Deployment | 1 | Contract deploys, admin set correctly |
| Role Management | 8 | Grant, revoke, events, unauthorized rejection, owner protection |
| Product Registration | 7 | Happy path, duplicates, unauthorized by every non-manufacturer role |
| Product Certification | 5 | Certifier-only, non-existent product, wrong status |
| Product Transfer | 8 | Owner enforcement, receiver role routing, non-existent, pre-receive transfer |
| Product Receiving | 5 | Expected receiver only, wrong status, unauthorized |
| Product Sale | 5 | Retailer + owner check, status check |
| Full Lifecycle | 2 | End-to-end forward chain, complete history accumulation |
| View Functions | 6 | getProduct, getHistory, verifyProduct, non-existent reverts |
| Invalid Transitions | 4 | Selling manufactured, transferring sold, certifying sold, receiving non-transit |
| Return Flow | 4 | Request, non-returnable, non-sold, non-existent |
| Return Acceptance | 3 | Retailer accept, non-retailer reject, full reverse chain |
| Inspection | 7 | All 4 outcomes, non-manufacturer, wrong status, invalid outcome, history preservation |
| Re-entry | 1 | Refurbished product completes a second forward cycle |
| History Immutability | 2 | Array growth only, chronological timestamps |
| **Total** | **78** | |

---

## 9. Starting the Full Application

Open **three separate terminals**:

### Terminal 1 — Blockchain Node

```bash
cd blockchain
npx hardhat node
```

This starts a local EVM on `http://127.0.0.1:8545` with 20 pre-funded test accounts.

### Terminal 2 — Deploy Contract & Start Backend

```bash
# Deploy the smart contract (first time only)
cd blockchain
npx hardhat ignition deploy ignition/modules/TraceChain.ts --network localhost

# Start the backend
cd ../backend
npm run dev
```

The backend starts on `http://localhost:5000`.

### Terminal 3 — Start Frontend

```bash
cd frontend
npm run dev
```

The frontend starts on `http://localhost:3000`.

### One-Time Setup

After all services are running, grant the manufacturer role to the backend wallet:

```bash
curl -X POST http://localhost:5000/api/products/setup
```

---

## 10. Live Demo Walkthrough

1. **Register a Product**: Fill out the registration form on the dashboard and click "Register Product". The on-chain transaction hash confirms immutable registration.

2. **Certify**: Click "Certify" to simulate a quality inspector approving the product. The status badge updates to `CERTIFIED`.

3. **Transfer to Distributor**: Enter a distributor wallet address and click "Transfer Product". Status changes to `IN_TRANSIT`.

4. **Receive at Distributor**: Click "Receive" (as the distributor). Status updates to `DISTRIBUTOR_RECEIVED`.

5. **Transfer to Retailer**: Transfer the product from distributor to retailer. Status returns to `IN_TRANSIT`.

6. **Receive at Retailer**: Retailer confirms receipt. Status: `RETAILER_RECEIVED`.

7. **Sell**: Click "Sell". Status: `SOLD`. The `soldAt` timestamp is recorded on-chain.

8. **Verify via QR Code**: The QR code displayed in the Product Info card can be scanned by any consumer. It encodes a unique verification URL for the product.

9. **View Lifecycle History**: The full history — every step, every actor, every timestamp — is displayed in the Lifecycle History panel, pulled directly from the blockchain.

---

## 11. SDG Alignment

| SDG | Alignment |
|---|---|
| **SDG 9 — Industry, Innovation & Infrastructure** | TraceChain demonstrates blockchain as resilient industrial infrastructure for supply chain management, replacing fragile paper-based tracking with an immutable digital ledger. |
| **SDG 12 — Responsible Consumption & Production** | The full return/inspection/refurbishment flow promotes circular economy practices. Consumers can verify product authenticity and provenance via QR codes, enabling informed purchasing decisions. |

---

## 12. Production Deployment Setup

This section covers the environment variables and configuration required to deploy TraceChain to **Sepolia Testnet**, **MongoDB Atlas**, **Render** (backend), and **Vercel** (frontend).

### 12.1 Environment Variables — Backend (Render)

Set these in the Render dashboard under **Environment → Environment Variables**:

| Variable | Description | Example |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/tracechain` |
| `RPC_URL` | Alchemy/Infura Sepolia RPC endpoint | `https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY` |
| `PRIVATE_KEY` | Deployer wallet private key (without `0x` prefix on some providers) | `ac0974bec39a17e36ba...` |
| `CONTRACT_ADDRESS` | Deployed TraceChain contract address on Sepolia | `0x1234...abcd` |
| `FRONTEND_URL` | Vercel production URL (for CORS) | `https://tracechain.vercel.app` |
| `PORT` | Server port (Render assigns automatically) | `5000` |

**Render build & start commands:**
```
Build Command:  npm install && npm run build
Start Command:  npm start
```

These map to the existing scripts in `backend/package.json`:
- `"build": "tsc"` — compiles TypeScript to `dist/`
- `"start": "node dist/server.js"` — runs the compiled server

### 12.2 Environment Variables — Frontend (Vercel)

Set these in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Render backend URL (no trailing slash) | `https://tracechain-backend.onrender.com` |

> **Note:** The `NEXT_PUBLIC_` prefix is required by Next.js to expose the variable to client-side code. All three `fetch()` calls in `page.tsx` use `process.env.NEXT_PUBLIC_API_URL` with a fallback to `http://localhost:5000` for local development.

**Vercel auto-detects** the Next.js framework and uses:
- `"build": "next build"`
- `"start": "next start"`

### 12.3 Environment Variables — Blockchain (Sepolia Deployment)

Create a `.env` file in the `blockchain/` directory:

```env
ALCHEMY_API_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your_wallet_private_key_here
```

These are read by `hardhat.config.ts` via `dotenv/config` to configure the `sepolia` network:

```typescript
networks: {
  sepolia: {
    url: process.env.ALCHEMY_API_URL || "",
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
  },
},
```

**Deploy to Sepolia:**
```bash
cd blockchain
npx hardhat ignition deploy ignition/modules/TraceChain.ts --network sepolia
```

After deployment, copy the output contract address and set it as `CONTRACT_ADDRESS` in the backend `.env` / Render environment.

**Grant roles on Sepolia:**
```bash
npx hardhat run setupRoles.js --network sepolia
```

### 12.4 Deployment Checklist

- [ ] Create MongoDB Atlas cluster and get connection string → set `MONGO_URI` on Render
- [ ] Create Alchemy account, get Sepolia API URL → set `ALCHEMY_API_URL` in `blockchain/.env`
- [ ] Fund deployer wallet with Sepolia ETH (faucet: `sepoliafaucet.com`)
- [ ] Deploy contract to Sepolia → note the contract address
- [ ] Run `setupRoles.js --network sepolia` to grant roles on-chain
- [ ] Deploy backend to Render with all env vars
- [ ] Deploy frontend to Vercel with `NEXT_PUBLIC_API_URL` pointing to Render
- [ ] Set `FRONTEND_URL` on Render to the Vercel production URL
- [ ] Test end-to-end: register → certify → transfer → receive → sell

---

## License

MIT

---

*This document serves as the definitive technical reference for the TraceChain project. For the original planning document covering DA1 migration decisions, see `README (1).md`.*

