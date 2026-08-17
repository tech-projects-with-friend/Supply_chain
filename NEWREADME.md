at > /mnt/user-data/outputs/README.md << 'ENDOFFILE'
# TraceChain — Final Project README (Full Detail)

**Blockchain-Based Supply Chain Management, Traceability & Return System**

Course: Blockchain Architecture (Slot 1) — VIT Chennai
Team: Amey Anil Bondre (25BCE1763) · Om Pravin Thavari (25BCE5180)

This is the single source of truth for building TraceChain from tomorrow onward. It is written to be self-contained — if you or an AI assistant reads only this file, you should understand the entire project: what it is, why every decision was made, and exactly what to build. Read Section 0 first.

---

## 0. Read This First — How This Plan Relates to DA1

Your DA1 submission proposed **Hyperledger Fabric** (permissioned network, 5 conceptual orgs, Node.js chaincode). The detailed spec you brought in afterward is built on **Ethereum-compatible chain + Solidity + Hardhat + MetaMask**. These are genuinely different platforms, so here is exactly what changed, what didn't, and why — written so you can repeat this reasoning confidently in a viva.

### What stays identical to DA1 (no explaining needed)
- The core idea: a permanent QR identity per product, blockchain-recorded lifecycle, tamper-evident history.
- The trust goal: no single company can secretly alter a product's history.
- SDG 9 (Industry, Innovation & Infrastructure) and SDG 12 (Responsible Consumption & Production) alignment.
- Role-based access control as the enforcement mechanism — only the mechanism changes (Solidity `modifier`s instead of Fabric MSP attributes), the principle ("only the current owner/role can act") is identical.
- Keeping sensitive commercial data (pricing, contracts) off-chain — true in both designs.
- QR code carries only a product ID / verify-URL, never the full history.

### What changed, and why (say this if asked)

| Area | DA1 said | We're building | Why the change is defensible |
|---|---|---|---|
| Platform | Hyperledger Fabric (permissioned) | Ethereum-compatible chain (Solidity, Hardhat dev network + Sepolia testnet for demo) | Fabric needs a multi-org network, CAs, and Docker infrastructure before you can write a line of business logic. For a 2-person team with limited weeks left, that setup risk was higher than the platform's benefit. Solidity + Hardhat gets you writing real business logic on day one, and a public testnet gives an independently verifiable demo (Etherscan-style explorer link). |
| Confidentiality | "Permissioned network keeps commercial data private" | "Public testnet, but commercial data was always meant to live off-chain in MongoDB anyway" | Only lifecycle *events* ever touch the chain in either design — never prices or contract terms. |
| Smart contract language | Node.js chaincode | Solidity | Matches the new toolchain; also the most common academic/industry choice. |
| Org model | 2 Fabric orgs, 5 client identities via ABAC attributes | 1 shared contract, 5 role identities via wallet address + on-chain role registry | Same idea (identity → role → permission), simpler to implement. |
| Roles | Supplier, Manufacturer, Distributor, Retailer, Certifier (5 orgs) | Manufacturer (absorbs Supplier), Certifier (kept), Distributor, Retailer, Admin, Customer | Supplier and Manufacturer merged for build simplicity. Certifier is deliberately kept so this stays consistent with the DA1 report/PPT, which both name an independent Certifier/Regulator and a `CertifyQuality` step. |
| Off-chain storage | Database + IPFS | Database now, IPFS deferred to post-MVP | Your own spec recommends this. Get the core workflow solid first. |
| Client apps | Two separate web apps (admin dashboard + consumer portal) | One Next.js app, role-protected routes for staff + a fully public `/verify/[productId]` route for consumers | Less work for two people; the consumer experience is still fully separate in practice (no login, own route, different look). |
| Return / reverse logistics | Not designed in DA1 | Full forward + reverse supply chain, including inspection and restock/refurbish/damage/dispose | Genuine scope increase over DA1 — biggest feasibility risk, protected by the MVP fallback in Section 88. |

**One-line answer if a professor asks "why not Fabric like your DA1 said?":**
*"We started with Hyperledger Fabric for its permissioned-network privacy model. During environment setup we found the multi-organisation Fabric infrastructure heavy for our timeline, so we moved to a Solidity/Ethereum-compatible testnet — it let us spend our limited time on the actual supply-chain logic instead of network infrastructure, while keeping every commercially sensitive field off-chain exactly as we originally planned."*

The earlier `TraceChain_Roadmap.md` and `TraceChain_Architecture_Setup.md` files are superseded by this document for anything about implementation. Keep them only as a record of the DA1-era plan.

---

## 1. Project Overview

TraceChain is a blockchain-based supply chain tracking and product-verification system built using an Ethereum-compatible blockchain and Solidity smart contracts.

The system tracks a product through its complete forward lifecycle:

```text
Manufacturer
     ↓
Certifier
     ↓
Distributor
     ↓
Retailer
     ↓
Customer
```

For products eligible for returns, it also supports a controlled reverse supply chain:

```text
Customer
     ↓
Retailer
     ↓
Distributor
     ↓
Manufacturer
```

Each product carries a **permanent QR code**. The QR identifies the product — it does **not** contain or store the complete product history. When scanned, the application retrieves the product's current status and full blockchain history live.

---

## 2. One-Sentence Project Definition

> A blockchain-based supply-chain management system where every product receives a permanent QR-based identity, its certification, ownership and lifecycle are recorded on an Ethereum-compatible blockchain, authorized participants must confirm receipt before forwarding products, and eligible returned products can travel backward through the supply chain while preserving their complete historical record.

---

## 3. Main Objectives

The main objective is to provide:

- Transparent product tracking
- Independent, on-chain quality certification before a product can move downstream
- Tamper-resistant supply-chain history
- Product authenticity verification
- Controlled ownership transfer
- Role-based supply-chain operations
- QR-based product identification
- Return tracking for eligible products
- Product condition tracking
- Complete forward and reverse supply-chain history
- Prevention of unauthorized product forwarding
- **SDG 9** — resilient, technology-driven infrastructure for tracking goods across a distributed network of organisations
- **SDG 12** — verifiable sourcing and certification discourage counterfeit and unsustainable products, and give consumers the information to make responsible choices

The blockchain acts as the **trusted source for important product lifecycle events**.

---

## 4. Core Concept

> **The QR code identifies the product, while the blockchain records the product's lifecycle.**

The physical QR code does not change when the product moves.

```text
QR Code
   ↓
Product ID: PROD-2026-000001
   ↓
Blockchain
   ↓
Current Owner
Certification Status
Current Status
Product Condition
Complete History
```

The same QR remains attached to the product throughout its lifecycle, including through a return.

---

## 5. Example Product Lifecycle

### Non-returnable product

```text
MANUFACTURED
      ↓
CERTIFIED
      ↓
IN_TRANSIT
      ↓
DISTRIBUTOR RECEIVED
      ↓
IN_TRANSIT
      ↓
RETAILER RECEIVED
      ↓
SOLD
```

### Returnable product

```text
MANUFACTURED
      ↓
CERTIFIED
      ↓
IN_TRANSIT
      ↓
DISTRIBUTOR RECEIVED
      ↓
IN_TRANSIT
      ↓
RETAILER RECEIVED
      ↓
SOLD
      ↓
RETURN REQUESTED
      ↓
RETURNED TO RETAILER
      ↓
RETURN IN TRANSIT
      ↓
DISTRIBUTOR RETURN RECEIVED
      ↓
RETURN IN TRANSIT
      ↓
MANUFACTURER RETURN RECEIVED
      ↓
INSPECTED
      ↓
RESTOCKED / REFURBISHED / DAMAGED / DISPOSED
```

The reverse process only exists when `returnEligible == true`.

---

## 6. Technology Stack

### Frontend
```text
Next.js
React
TypeScript
Tailwind CSS
```
Handles: UI, dashboards, product registration, transfer, receiving, certification, verification, QR generation, QR scanning, return workflows, blockchain transaction interaction.

### Backend
```text
Node.js
Express.js
TypeScript
MongoDB
Mongoose
JWT
```
Handles: authentication, user management, role management, application-level APIs, MongoDB operations, off-chain supporting information, blockchain event synchronisation.

### Blockchain
```text
Ethereum-compatible blockchain
Solidity
Hardhat
ethers.js
MetaMask
```
Development network: **Hardhat local network**. Demo network: **Ethereum Sepolia testnet** (free faucet ETH — gives an independently verifiable, public block-explorer link for the final demo). **Never use real cryptocurrency or mainnet.**

### Database
```text
MongoDB
```
Stores application data that does not need to be permanently on-chain.

---

## 7. Why Blockchain Is Used

Blockchain is used for information that should be difficult to modify after recording:

- Product creation
- Certification
- Product ownership transfer
- Product receipt
- Product sale
- Return request
- Return acceptance
- Reverse transfer
- Manufacturer inspection
- Product condition changes
- Product lifecycle history

It provides: **transparency, traceability, tamper resistance, decentralised verification.**

---

## 8. Why MongoDB Is Also Used

Not everything belongs on a blockchain. MongoDB can store:

- User accounts, names, emails, password hashes
- Role information
- UI-specific data
- Product descriptions and images
- Search indexes
- Application metadata

Sensitive or unnecessary customer information should **never** be stored on-chain.

---

## 9. Customer Privacy Rule

The project does **not** require customer details for product tracking. Do not require or store: customer name, phone, address, email, or any personal information.

The customer interacts with the product purely through its QR code. The system only needs to know the product's blockchain lifecycle — not who bought it. If a return occurs, the system records the return event but does not need to identify the customer.

---

## 10. User Roles — Overview

```text
ADMIN
MANUFACTURER   (absorbs the raw-material Supplier role)
CERTIFIER
DISTRIBUTOR
RETAILER
```

The customer is treated as a product verifier/return requester rather than a supply-chain organisation, and never holds a blockchain identity.

---

## 11. Manufacturer Responsibilities

Manufacturer **can**:
- Register products
- Set product information
- Set whether the product is return eligible
- Set the return period, if applicable
- Transfer certified products to distributors
- Receive returned products
- Inspect returned products
- Mark returned products as: Restocked, Refurbished, Damaged, or Disposed

Manufacturer **cannot**:
- Modify historical blockchain records
- Modify another organisation's ownership
- Certify its own product
- Pretend to receive a product not assigned to it
- Create a return for a non-returnable product

---

## 12. Certifier Responsibilities

Certifier **can**:
- Review a manufactured product and certify its quality
- Move a product's status from `MANUFACTURED` to `CERTIFIED`, the gate a product must pass before it can leave the manufacturer

Certifier **cannot**:
- Register products
- Transfer ownership
- Modify product information other than certification status
- Certify a product that is not currently `MANUFACTURED`

---

## 13. Distributor Responsibilities

Distributor **can**:
- Receive products from the manufacturer
- View product history
- Transfer products to retailer
- Receive returned products from retailer
- Transfer returned products back to manufacturer

Distributor **cannot**:
- Register or certify products
- Modify product creation information
- Mark a product as refurbished or disposed
- Transfer a product before receiving it

---

## 14. Retailer Responsibilities

Retailer **can**:
- Receive products from distributors
- View product history
- Sell products
- Accept eligible returned products
- Transfer returned products to distributor

Retailer **cannot**:
- Register or certify products
- Change manufacturer information
- Mark products as refurbished or disposed
- Forward a product before receiving it

---

## 15. Customer Responsibilities

Customer **can**:
- Scan QR
- Verify authenticity
- View product history and current status
- Request a return if the product is return eligible

Customer **cannot**:
- Become a blockchain supply-chain owner
- Change product ownership directly
- Modify product history or condition
- Forward the product

---

## 16. Product Registration

Only a manufacturer can register a product.

Example registration form:

```text
Product Name
Product Category
Batch ID
Manufacturing Date
Expiry Date (optional)
Manufacturing Location
Return Eligible
Return Period (if applicable)
```

Flow after clicking **REGISTER PRODUCT**:

```text
Generate Product ID
       ↓
Create blockchain transaction
       ↓
Smart contract creates product (status = MANUFACTURED)
       ↓
Transaction confirmed
       ↓
Generate QR
       ↓
Display QR for printing
```

---

## 17. Product ID

Every product must have a unique identifier, e.g.:

```text
PROD-2026-000001
PROD-2026-000002
PROD-2026-000003
```

The Product ID must be unique — the smart contract rejects a duplicate. It is the primary identifier used throughout the application, and the QR references this ID.

---

## 18. QR Code Design

The QR code should **not** contain the entire product history. Recommended content:

```text
https://tracechain.example/verify/PROD-2026-000001
```

When scanned:

```text
QR
 ↓
Verification Page
 ↓
Product ID
 ↓
Blockchain
 ↓
Product Information
 ↓
Complete History
```

The physical QR code remains unchanged for the product's entire life.

---

## 19. QR Lifecycle

The manufacturer generates the QR after product registration.

```text
Manufacturer registers:
Product ID: PROD-2026-000001

System generates:
https://tracechain.example/verify/PROD-2026-000001

QR is generated.
Manufacturer prints QR.
QR is attached to the physical product.
```

The same QR is used by the Certifier, Distributor, Retailer, and Customer throughout the lifecycle, including through a return.

---

## 20. Important QR Rule

The QR code itself does **not** represent ownership. It only represents Product Identity. Ownership is determined entirely by the blockchain.

```text
QR → Product ID
Product ID → Blockchain
Blockchain → Current Owner + Status + History
```

---

## 21. Product Data Structure (conceptual)

```text
Product
│
├── productId
├── name
├── category
├── batchId
├── manufacturer
├── certifier
├── currentOwner
├── expectedReceiver
├── status
├── condition
├── returnEligible
├── returnPeriod
├── soldAt
├── manufacturingDate
├── expiryDate
├── manufacturingLocation
├── createdAt
└── history
```

---

## 22. Solidity Product Structure

Starting point — adjust types and implementation during actual development.

```solidity
struct Product {
    uint256 productId;
    string name;
    string category;
    string batchId;

    address manufacturer;
    address certifier;
    address currentOwner;
    address expectedReceiver;   // who must call receiveProduct() next

    ProductStatus status;
    ProductCondition condition;

    bool returnEligible;
    uint256 returnPeriod;       // in seconds
    uint256 soldAt;             // used to check the return window

    uint256 manufacturingDate;
    uint256 expiryDate;

    string manufacturingLocation;

    bool exists;
}
```

Do not copy this blindly — adjust during actual smart-contract development.

---

## 23. Product History Structure

Every important lifecycle event is recorded.

```solidity
struct HistoryEntry {
    address actor;
    string action;
    address from;
    address to;
    uint256 timestamp;
}
```

Example entries:

```text
Action: PRODUCT_CREATED
Actor: Manufacturer wallet
From: none  To: Manufacturer wallet
Timestamp: 17 Aug 2026
```

```text
Action: PRODUCT_CERTIFIED
Actor: Certifier wallet
Timestamp: 18 Aug 2026
```

```text
Action: PRODUCT_TRANSFERRED
From: Manufacturer  To: Distributor
Timestamp: 19 Aug 2026
```

---

## 24. Product Status

An enum is used rather than arbitrary strings wherever practical.

```text
MANUFACTURED
CERTIFIED
IN_TRANSIT
DISTRIBUTOR_RECEIVED
RETAILER_RECEIVED
SOLD

RETURN_REQUESTED
RETURNED_TO_RETAILER
RETURN_IN_TRANSIT
DISTRIBUTOR_RETURN_RECEIVED
MANUFACTURER_RETURN_RECEIVED

INSPECTED
RESTOCKED
REFURBISHED
DAMAGED
DISPOSED
```

`IN_TRANSIT` and `RETURN_IN_TRANSIT` are each reused for both hops of their respective journeys — the `expectedReceiver` field, not a separate enum value, disambiguates who must act next. Exact names may be adjusted during implementation, but the state machine (Section 72) must remain consistent.

---

## 25. Product Condition

Product condition is separate from product status.

```text
NEW
USED
RETURNED
REFURBISHED
DAMAGED
DISPOSED
```

Example:

```text
status = SOLD          condition = NEW
```

After a return:

```text
status = RETURNED_TO_RETAILER      condition = RETURNED
```

After manufacturer refurbishment:

```text
status = REFURBISHED      condition = REFURBISHED
```

---

## 26. Return Eligibility

Every product must have `returnEligible = true` or `returnEligible = false`. This value is fixed at registration time and never changes afterward.

---

## 27. Non-Returnable Products

This is a strict business rule. If `returnEligible == false`:

- Customer cannot request a return
- The "Request Return" button must not appear
- The return workflow must not be reachable
- The smart contract must reject return transactions outright
- The product must never enter a return state

Example:

```text
Product: CUSTOM-001
Return Eligible: NO
Status: SOLD
```

There is no `REQUEST RETURN` option — structurally absent, not merely hidden.

---

## 28. Returnable Products

If `returnEligible == true`, the product can potentially enter the return workflow.

```text
Product: LAP-001
Return Eligible: YES
Return Period: 30 days
Status: SOLD
```

The return option is shown only if the return period is still valid.

---

## 29. Return Period

Return period is optional but recommended.

```text
returnPeriod = 30 days
```

Conceptually:

```text
soldAt + returnPeriod >= currentTime  →  Return Allowed
soldAt + returnPeriod <  currentTime  →  Return Period Expired
```

The smart contract must enforce this — not only the frontend.

---

## 30. Forward Supply Chain

```text
MANUFACTURER
     ↓
CERTIFIER
     ↓
TRANSFER
     ↓
DISTRIBUTOR
     ↓
RECEIVE
     ↓
TRANSFER
     ↓
RETAILER
     ↓
RECEIVE
     ↓
SELL
     ↓
CUSTOMER
```

---

## 31. Critical Ownership Rule

A participant cannot transfer a product unless they are the current authorised owner.

```solidity
require(
    products[productId].currentOwner == msg.sender,
    "Caller is not the current owner"
);
```

---

## 32. Critical Receiving Rule

A receiver must confirm receipt before they can forward the product.

```text
Manufacturer → TRANSFER → Distributor
```

After transfer:

```text
Distributor: NOT YET RECEIVED
```

Distributor must call `receiveProduct()`. Only after that:

```text
Distributor: CURRENT OWNER
```

Then, and only then, can the distributor transfer onward. This is enforced in Solidity, not just the UI.

---

## 33. Never Depend Only on Frontend Validation

This is extremely important.

Bad — UI-only check, not security:

```javascript
if (status === "RECEIVED") {
    enableTransferButton();
}
```

A malicious user could call the smart contract directly (e.g. through Etherscan or a script), bypassing the frontend entirely. The smart contract itself must enforce:

```text
Correct caller
+ Correct current owner
+ Correct product status
+ Correct next state
= Transaction allowed
```

---

## 34. Return Workflow

```text
CUSTOMER
    ↓
REQUEST RETURN
    ↓
RETAILER
    ↓
ACCEPT RETURN
    ↓
RETAILER POSSESSION
    ↓
TRANSFER RETURN
    ↓
DISTRIBUTOR
    ↓
RECEIVE RETURN
    ↓
TRANSFER RETURN
    ↓
MANUFACTURER
    ↓
RECEIVE RETURN
    ↓
INSPECT
```

---

## 35. Customer Return Request

Customer scans QR. If `returnEligible == true` and the product is currently eligible:

```text
[ REQUEST RETURN ]
```

The system creates `RETURN_REQUESTED`. No customer information is required.

---

## 36. Retailer Return Acceptance

Retailer receives the physical returned product and scans its QR.

```text
Product: PROD-001
Return Status: RETURN REQUESTED
[ ACCEPT RETURN ]
```

On acceptance:

```text
RETURN_REQUESTED → RETURNED_TO_RETAILER
```

Only now can the retailer send it backward.

---

## 37. Retailer Cannot Forward Before Accepting Return

If the retailer tries to forward a returned product without accepting it first, the transaction is rejected by the smart contract.

---

## 38. Distributor Return

Retailer transfers the returned product to distributor. Distributor must receive it before forwarding to manufacturer — the same "must receive before forward" rule from Section 32 applies identically on the reverse path.

---

## 39. Manufacturer Return Inspection

Manufacturer receives the returned product and inspects it. Possible results:

```text
RESTOCKED
REFURBISHED
DAMAGED
DISPOSED
```

```text
MANUFACTURER_RETURN_RECEIVED → INSPECT → REFURBISHED
```

The product is **not** reset to its original state.

---

## 40. Returned Product Never Loses History

This is a strict rule. If a product was sold and returned:

```text
Manufactured → Certified → Distributed → Retailed → Sold → Returned → Inspected → Refurbished
```

The blockchain history remains in full. It must never collapse into something like `Manufactured → Refurbished` with the intervening lifecycle hidden.

---

## 41. Product Can Be Sold Again

A returned product can potentially re-enter the supply chain.

```text
Manufacturer → REFURBISHED → Distributor → Retailer → SOLD AGAIN
```

Its condition remains `REFURBISHED`. It never becomes `NEW` again unless a future business-rule change explicitly allows it, which this project currently does not.

---

## 42. Full Product Lifecycle Example

```text
Product ID: LAP-001
```

**First lifecycle**

```text
Manufacturer → Certifier → Distributor → Retailer → Customer
```

History:

```text
1. CREATED
2. CERTIFIED
3. TRANSFERRED_TO_DISTRIBUTOR
4. DISTRIBUTOR_RECEIVED
5. TRANSFERRED_TO_RETAILER
6. RETAILER_RECEIVED
7. SOLD
```

**Return**

```text
Customer → Retailer → Distributor → Manufacturer
```

History:

```text
8. RETURN_REQUESTED
9. RETURN_ACCEPTED_BY_RETAILER
10. RETURNED_TO_DISTRIBUTOR
11. DISTRIBUTOR_RECEIVED_RETURN
12. RETURNED_TO_MANUFACTURER
13. MANUFACTURER_RECEIVED_RETURN
14. INSPECTED
15. REFURBISHED
```

**Second sale**

```text
16. TRANSFERRED_TO_DISTRIBUTOR
17. DISTRIBUTOR_RECEIVED
18. TRANSFERRED_TO_RETAILER
19. RETAILER_RECEIVED
20. SOLD_AGAIN
```

Nothing is ever deleted.

---

## 43. Smart Contract Responsibilities

The smart contract is responsible for: product creation, certification, ownership, state transitions, role authorisation, return eligibility and validation, product history, important timestamps, product condition, and event emission. It is the **final authority** for blockchain state.

---

## 44. Smart Contract Functions

| Function | Caller | Effect |
|---|---|---|
| `registerProduct(...)` | Manufacturer | Creates product, status → `MANUFACTURED`, condition → `NEW` |
| `certifyProduct(productId)` | Certifier | status → `CERTIFIED` (must currently be `MANUFACTURED`) |
| `transferProduct(productId, to)` | Current owner | Sets `expectedReceiver`, status → `IN_TRANSIT` |
| `receiveProduct(productId)` | `expectedReceiver` only | `currentOwner` = caller, status → `DISTRIBUTOR_RECEIVED` / `RETAILER_RECEIVED` |
| `sellProduct(productId)` | Retailer, current owner | status → `SOLD`, records `soldAt` |
| `requestReturn(productId)` | Anyone (no identity check) | Requires `returnEligible`, status `SOLD`, within window → `RETURN_REQUESTED` |
| `acceptReturn(productId)` | Retailer, current holder | status → `RETURNED_TO_RETAILER`, condition → `RETURNED` |
| `transferReturn(productId, to)` | Current holder | Same pattern as forward transfer, reused for reverse hops |
| `receiveReturn(productId)` | `expectedReceiver` only | Same pattern as forward receive, reused for reverse hops |
| `inspectAndResolve(productId, outcome)` | Manufacturer, after `MANUFACTURER_RETURN_RECEIVED` | status → `INSPECTED` then `RESTOCKED`/`REFURBISHED`/`DAMAGED`/`DISPOSED` |
| `getProduct(productId)` | Public, read-only | Returns full product record |
| `getHistory(productId)` | Public, read-only | Returns full history array — powers `/verify` |
| `verifyProduct(productId)` | Public, read-only | Convenience wrapper combining the above two for the frontend |

Exact function names may change during implementation, but functionality must remain equivalent.

---

## 45. Smart Contract Events

```solidity
ProductCreated
ProductCertified
ProductTransferred
ProductReceived
ProductSold

ReturnRequested
ReturnAccepted
ReturnTransferred
ReturnReceived

ProductInspected
ProductRestocked
ProductRefurbished
ProductDamaged
ProductDisposed
```

Events let the frontend/backend track blockchain activity efficiently without polling every block.

---

## 46. Role Authorization

The contract maintains authorised wallet addresses per role.

```text
Manufacturer addresses
Certifier addresses
Distributor addresses
Retailer addresses
Admin address
```

```solidity
modifier onlyAdmin()        { require(admins[msg.sender], "Not admin"); _; }
modifier onlyManufacturer() { require(manufacturers[msg.sender], "Not manufacturer"); _; }
modifier onlyCertifier()    { require(certifiers[msg.sender], "Not certifier"); _; }
modifier onlyDistributor()  { require(distributors[msg.sender], "Not distributor"); _; }
modifier onlyRetailer()     { require(retailers[msg.sender], "Not retailer"); _; }

modifier onlyCurrentOwner(uint256 id) {
    require(products[id].currentOwner == msg.sender, "Not current owner");
    _;
}
```

Do not rely only on the backend role system — blockchain-level authorisation is required for every important operation.

---

## 47. Blockchain vs Backend Authentication

There are two different identities:

**Application identity** — handled by JWT, MongoDB, the backend. Used for: login, dashboard, application permissions, user profile.

**Blockchain identity** — handled by wallet address, MetaMask, the smart contract. Used for: blockchain transactions, ownership, blockchain-level role authorisation.

The application connects the authenticated user's account to their authorised wallet address, but the contract is what actually enforces permissions.

---

## 48. MongoDB User Structure

```text
User
│
├── _id
├── name
├── email
├── passwordHash
├── role          (ADMIN | MANUFACTURER | CERTIFIER | DISTRIBUTOR | RETAILER)
├── walletAddress
└── createdAt
```

Do not store unnecessary customer information — customers are never stored as users at all.

---

## 49. MongoDB Product Structure

An off-chain representation for fast application access. The blockchain remains authoritative for critical lifecycle information.

```text
Product
│
├── productId
├── name, category, batchId
├── manufacturerAddress
├── certifierAddress
├── currentOwnerAddress
├── status, condition
├── returnEligible, returnPeriod
├── manufacturingDate, expiryDate, manufacturingLocation
├── blockchainTxHash
├── qrUrl
└── createdAt
```

---

## 50. MongoDB Supply Chain Event

Optional off-chain event model, useful for efficient dashboards and search:

```text
SupplyChainEvent
│
├── productId
├── action
├── actorAddress
├── fromAddress, toAddress
├── transactionHash
├── timestamp
└── location
```

---

## 51. Backend API Structure

```text
POST /api/auth/register        POST /api/auth/login        GET /api/auth/me

POST /api/products                          (manufacturer: register)
GET  /api/products/:id
GET  /api/products/:id/history
GET  /api/products/:id/verify               (public — powers /verify)
POST /api/products/:id/certify              (certifier)
POST /api/products/:id/transfer
POST /api/products/:id/receive
POST /api/products/:id/sell

POST /api/products/:id/return/request       (public — no auth required)
POST /api/products/:id/return/accept
POST /api/products/:id/return/transfer
POST /api/products/:id/return/receive
POST /api/products/:id/return/inspect

GET  /api/blockchain/status                 (health check / current block, network)
```

The actual blockchain transaction happens through the blockchain service (Section 52) — routes should not embed raw ethers.js logic. No API route should ever bypass a rule the smart contract itself enforces.

---

## 52. Blockchain Service

A dedicated module, e.g. `services/blockchainService.ts`, responsible for:

```text
Connect to blockchain (RPC)
Load contract (ABI + address)
Read product / history
Create transactions
Wait for confirmation
Parse events
Return transaction hash
```

The rest of the backend should call this service rather than touching `ethers.js` directly everywhere.

---

## 53. Frontend Pages

```text
/
├── login
├── register
├── dashboard
│
├── manufacturer
│   ├── products
│   ├── register-product
│   └── returns
│
├── certifier
│   ├── pending
│   └── certify
│
├── distributor
│   ├── products
│   └── returns
│
├── retailer
│   ├── products
│   ├── sell
│   └── returns
│
├── verify
│   └── [productId]        ← PUBLIC, no login — the "consumer portal"
│
└── admin
    ├── users
    └── organizations
```

---

## 54. Product Verification Page

The main customer-facing page: `/verify/[productId]`. Displays:

```text
Product Name
Product ID
Batch ID
Manufacturer
Certifier
Current Status
Current Condition
Return Eligibility
Manufacturing Date
Expiry Date
```

And most importantly: **COMPLETE SUPPLY CHAIN TIMELINE.**

---

## 55. Verification Result

If the product exists:

```text
✓ PRODUCT VERIFIED

Product ID: PROD-2026-000001
Manufacturer: ABC Manufacturing
Certifier: XYZ Quality Labs
Current Status: RETAILER RECEIVED
Condition: NEW
```

If it does not:

```text
✗ PRODUCT NOT VERIFIED

This product ID does not exist
on the blockchain.
```

---

## 56. Suspicious Product Detection

Optionally compare the blockchain's `currentOwner` against the retailer scanning the product. If they don't match:

```text
WARNING:
This product is not currently assigned
to this retailer.
```

Useful for flagging counterfeit or unauthorised-resale scenarios. This is a nice-to-have on top of the MVP, not required for it — see Section 89.

---

## 57. QR Generation Workflow

```text
Smart Contract
      ↓
Product Created
      ↓
Product ID
      ↓
QR URL generated
      ↓
QR image generated
      ↓
Display to Manufacturer
      ↓
Print QR
      ↓
Attach to product
```

Only generate a QR for a product that actually exists on-chain — never generate a "final" QR before the registration transaction is confirmed.

---

## 58. QR Scanning

Two implementations, both supported:

**Option 1 — camera scan.** Use the phone camera to scan the QR. *(post-MVP — see Section 89.)*

**Option 2 — manual entry.** Build this first; it's what you'll use constantly during development.

```text
[ Scan QR ]
     or
Enter Product ID:
[ PROD-000001 ]
[ VERIFY ]
```

---

## 59. Recommended Project Folder Structure

```text
tracechain/
│
├── README.md
│
├── frontend/                       Next.js — one app
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── dashboard/
│   │   │   │
│   │   │   ├── manufacturer/
│   │   │   │   ├── products/
│   │   │   │   ├── register-product/
│   │   │   │   └── returns/
│   │   │   │
│   │   │   ├── certifier/
│   │   │   │   ├── pending/
│   │   │   │   └── certify/
│   │   │   │
│   │   │   ├── distributor/
│   │   │   │   ├── products/
│   │   │   │   └── returns/
│   │   │   │
│   │   │   ├── retailer/
│   │   │   │   ├── products/
│   │   │   │   ├── sell/
│   │   │   │   └── returns/
│   │   │   │
│   │   │   ├── verify/
│   │   │   │   └── [productId]/
│   │   │   │
│   │   │   └── admin/
│   │   │       ├── users/
│   │   │       └── organizations/
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductTimeline.tsx
│   │   │   ├── QRCode.tsx
│   │   │   ├── QRScanner.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── Loading.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── blockchain.ts
│   │   │   └── utils.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useBlockchain.ts
│   │   │   └── useProduct.ts
│   │   │
│   │   └── types/
│   │       ├── product.ts
│   │       ├── user.ts
│   │       └── blockchain.ts
│   │
│   ├── .env.local
│   ├── package.json
│   └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── productController.ts
│   │   │   └── returnController.ts
│   │   │
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Product.ts
│   │   │   └── SupplyChainEvent.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── productRoutes.ts
│   │   │   └── returnRoutes.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts
│   │   │   ├── roleMiddleware.ts
│   │   │   └── errorMiddleware.ts
│   │   │
│   │   ├── services/
│   │   │   ├── blockchainService.ts
│   │   │   ├── productService.ts
│   │   │   └── qrService.ts
│   │   │
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   └── blockchain.ts
│   │   │
│   │   ├── utils/
│   │   │
│   │   └── server.ts
│   │
│   ├── .env
│   └── package.json
│
├── blockchain/
│   ├── contracts/
│   │   └── TraceChain.sol
│   │
│   ├── scripts/
│   │   └── deploy.ts
│   │
│   ├── test/
│   │   └── TraceChain.test.ts
│   │
│   ├── ignition/
│   │   └── modules/
│   │       └── TraceChain.ts
│   │
│   ├── hardhat.config.ts
│   ├── package.json
│   └── .env
│
├── docs/
│   ├── architecture.md
│   ├── smart-contract.md
│   ├── api.md
│   ├── database.md
│   └── workflow.md
│
└── .gitignore
```

---

## 60. Environment Variables

Never commit secrets to GitHub.

```text
# backend/.env
PORT=5000
MONGODB_URI=...
JWT_SECRET=...
RPC_URL=...
CONTRACT_ADDRESS=...

# frontend/.env.local
NEXT_PUBLIC_API_URL=...
NEXT_PUBLIC_CONTRACT_ADDRESS=...
NEXT_PUBLIC_CHAIN_ID=...

# blockchain/.env
RPC_URL=...
PRIVATE_KEY=...
```

The private key must never be committed to GitHub. Use `.env` and `.gitignore`.

---

## 61. Smart Contract Architecture Overview

```text
TraceChain.sol
│
├── Roles
├── Product
├── HistoryEntry
├── ProductStatus (enum)
├── ProductCondition (enum)
├── Product mapping
├── History mapping
├── Registration functions
├── Certification functions
├── Transfer functions
├── Receive functions
├── Sale functions
├── Return functions
├── Inspection functions
├── Verification (view) functions
└── Events
```

---

## 62. Product & History Mappings

```solidity
mapping(uint256 => Product) public products;
mapping(uint256 => HistoryEntry[]) private productHistory;
```

Product ID maps to product information; each product has an array of historical events.

---

## 63. Product Registration Logic

```text
registerProduct()
        ↓
Check caller is an authorised manufacturer
        ↓
Check Product ID doesn't already exist
        ↓
Create Product
        ↓
currentOwner = manufacturer
        ↓
status = MANUFACTURED
        ↓
condition = NEW
        ↓
Set returnEligible / returnPeriod
        ↓
Record history
        ↓
Emit ProductCreated
```

---

## 64. Certification Logic

```text
certifyProduct(productId)
        ↓
Check caller is an authorised certifier
        ↓
Check product exists and status == MANUFACTURED
        ↓
certifier = caller
        ↓
status = CERTIFIED
        ↓
Record history
        ↓
Emit ProductCertified
```

---

## 65. Transfer Logic

```text
transferProduct(productId, receiver)
        ↓
Check product exists
        ↓
Check caller == currentOwner
        ↓
Check current status allows transfer (CERTIFIED, or a return status)
        ↓
Check receiver has the appropriate downstream role
        ↓
expectedReceiver = receiver
        ↓
status = IN_TRANSIT
        ↓
Record history
        ↓
Emit ProductTransferred
```

---

## 66. Receive Logic

```text
receiveProduct(productId)
        ↓
Check product exists
        ↓
Check caller == expectedReceiver
        ↓
Check status == IN_TRANSIT
        ↓
status = DISTRIBUTOR_RECEIVED / RETAILER_RECEIVED
        ↓
currentOwner = caller
        ↓
Record history
        ↓
Emit ProductReceived
```

---

## 67. Sale Logic

Only a retailer can sell.

```text
sellProduct(productId)
        ↓
Check caller is a retailer
        ↓
Check caller is current owner
        ↓
Check status == RETAILER_RECEIVED
        ↓
status = SOLD
        ↓
Record soldAt timestamp
        ↓
Record history
        ↓
Emit ProductSold
```

No customer information is required.

---

## 68. Return Request Logic

```text
requestReturn(productId)
        ↓
Check product exists
        ↓
Check returnEligible == true
        ↓
Check status == SOLD
        ↓
Check return period has not expired
        ↓
status = RETURN_REQUESTED
        ↓
Record history
        ↓
Emit ReturnRequested
```

Customer identity does not need to be stored.

---

## 69. Return Acceptance Logic

```text
acceptReturn(productId)
        ↓
Check caller is a retailer
        ↓
Check product is currently assigned to that retailer
        ↓
Check status == RETURN_REQUESTED
        ↓
status = RETURNED_TO_RETAILER
        ↓
condition = RETURNED
        ↓
Record history
        ↓
Emit ReturnAccepted
```

---

## 70. Reverse Transfer / Receive Logic

Retailer:

```text
RETURNED_TO_RETAILER → transferReturn() → RETURN_IN_TRANSIT
```

Distributor:

```text
RETURN_IN_TRANSIT → receiveReturn() → DISTRIBUTOR_RETURN_RECEIVED
DISTRIBUTOR_RETURN_RECEIVED → transferReturn() → RETURN_IN_TRANSIT
```

Manufacturer:

```text
RETURN_IN_TRANSIT → receiveReturn() → MANUFACTURER_RETURN_RECEIVED
```

Same "must-receive-before-forward" rule as the forward path applies identically here.

---

## 71. Inspection Logic

Only the manufacturer can inspect a returned product.

```text
inspectAndResolve(productId, outcome)
        ↓
Check caller is manufacturer
        ↓
Check status == MANUFACTURER_RETURN_RECEIVED
        ↓
status = INSPECTED
        ↓
Based on outcome:
   RESTOCKED | REFURBISHED | DAMAGED | DISPOSED
        ↓
condition updated to match
        ↓
Record history
        ↓
Emit corresponding event
```

---

## 72. State Transition Rules

The state machine must prevent invalid transitions.

**Valid forward flow:**

```text
MANUFACTURED
→ CERTIFIED
→ IN_TRANSIT
→ DISTRIBUTOR_RECEIVED
→ IN_TRANSIT
→ RETAILER_RECEIVED
→ SOLD
```

**Valid return flow:**

```text
SOLD
→ RETURN_REQUESTED
→ RETURNED_TO_RETAILER
→ RETURN_IN_TRANSIT
→ DISTRIBUTOR_RETURN_RECEIVED
→ RETURN_IN_TRANSIT
→ MANUFACTURER_RETURN_RECEIVED
→ INSPECTED
```

**After inspection:**

```text
INSPECTED → RESTOCKED
INSPECTED → REFURBISHED
INSPECTED → DAMAGED
INSPECTED → DISPOSED
```

No arbitrary jumps should be permitted — every function must check the *current* status before changing it.

---

## 73. Important Security Rules

The smart contract must prevent:

```text
Unauthorized registration
Unauthorized certification
Unauthorized transfer
Unauthorized receiving
Unauthorized selling
Unauthorized return acceptance
Unauthorized inspection
Unauthorized condition changes
Invalid state transitions
Return of non-returnable products
Certification of an already-certified product
Transfer before certification
Transfer before receiving
```

---

## 74. Immutability Rule

Historical events must never be edited or deleted. Do not implement functions like `deleteHistory()`, `editHistory()`, or `deleteProductHistory()`. If a mistake occurs, create a new corrective event rather than modifying an old one.

---

## 75. Product Deletion

Products are never deleted from the blockchain. If a product is no longer usable:

```text
condition = DISPOSED
status = DISPOSED
```

The history remains fully available.

---

## 76. Duplicate Product Prevention

A Product ID must never be registered twice. The smart contract checks `exists` and rejects the transaction if true.

---

## 77. Wallet Address Rules

Each manufacturer, certifier, distributor, and retailer must have an authorised blockchain wallet.

```text
Manufacturer: 0xABC...
Certifier:    0x456...
Distributor:  0xDEF...
Retailer:     0x123...
```

These addresses are used for blockchain-level authorisation via the modifiers in Section 46.

---

## 78. Transaction Hash

Every blockchain transaction has a transaction hash.

```text
0x8a7c92...
```

The UI can display:

```text
Blockchain Transaction:
0x8a7c92...
[ View on Blockchain Explorer ]
```

Since the demo runs on Sepolia, this links to a real, independently checkable public explorer — a strong point in a live demo.

---

## 79. Frontend Blockchain Interaction

```text
Frontend
   ↓
MetaMask
   ↓
ethers.js
   ↓
Smart Contract
   ↓
Blockchain
```

MetaMask signs blockchain transactions on behalf of the connected staff member.

---

## 80. Backend Blockchain Interaction

The backend uses ethers.js for reading blockchain data, listening to events, synchronising the MongoDB cache, and server-side verification. **Never put a user's private wallet key in the frontend** — staff sign with their own MetaMask; the backend only holds a deployer/service key where strictly necessary (e.g. Hardhat deployment scripts).

---

## 81. Database Principle — Source of Truth

When blockchain and MongoDB contain overlapping information, the blockchain always wins.

```text
1. Smart Contract / Blockchain   (highest authority)
2. Backend logic
3. MongoDB cache
4. Frontend state                (lowest authority)
```

Example: if MongoDB says `currentOwner = Retailer A` but the blockchain says `currentOwner = Distributor B`, the blockchain value wins and the application should reconcile the database.

---

## 82. Error Handling

The frontend must display understandable errors, never raw Solidity revert strings. Examples to design around:

```text
You are not the current owner.
Product must be received before it can be transferred.
This product must be certified before it can be transferred.
This product is not eligible for return.
Return period has expired.
Only the manufacturer can inspect this product.
Only the certifier can certify this product.
Product does not exist.
Invalid product state for this action.
Unauthorized wallet for this role.
Transaction rejected by user (MetaMask).
Blockchain transaction failed — please retry.
```

---

## 83. Testing Requirements

The smart contract must be tested extensively:

```text
Product registration
Duplicate registration rejected
Unauthorized registration rejected
Certification by non-certifier rejected
Certification of non-MANUFACTURED product rejected
Forward transfer before certification rejected
Forward transfer by non-owner rejected
Forward transfer before receiving rejected
Correct receiving succeeds
Wrong receiver rejected
Sale by non-retailer rejected
Sale before RETAILER_RECEIVED rejected
Return request on non-returnable product rejected
Return request after window expiry rejected
Return request on valid product succeeds
Retailer forwarding return before accepting rejected
Return acceptance succeeds
Reverse transfer/receive mirrors forward rules
Manufacturer inspection by non-manufacturer rejected
Restock outcome
Refurbishment outcome
Damage outcome
Disposal outcome
Refurbished product can re-enter forward flow
History array only grows, never shrinks
Invalid state transitions rejected across the board
```

---

## 84. Example Test Walkthrough

Test that a distributor cannot forward a product before receiving it:

```text
Manufacturer registers product
        ↓
Certifier certifies product
        ↓
Manufacturer transfers to distributor
        ↓
Distributor attempts transfer to retailer (without receiving first)
        ↓
EXPECTED: transaction REVERTS
```

Then confirm the happy path immediately after:

```text
Distributor receives
        ↓
Distributor transfers to retailer
        ↓
EXPECTED: transaction succeeds
```

Pairing a "should fail" case with the matching "should succeed" case, back to back, is the fastest way to prove a rule is actually enforced rather than accidentally always passing.

---

## 85. Git Structure

Use Git from day one. Recommended branches:

```text
main
develop
feature/frontend
feature/backend
feature/blockchain
```

Do not experiment directly on `main`.

---

## 86. Team Responsibilities (2-person team)

Suggested split — swap based on who's stronger where:

**Amey — Blockchain + Backend:** Solidity contract, Hardhat tests/deployment, MongoDB models, Express API, blockchainService integration.

**Om — Frontend + Integration:** All Next.js pages/dashboards, MetaMask/ethers.js wiring, QR generation & scanning, end-to-end demo assembly.

Both must be able to explain every layer in a viva — "I only did frontend" is not a safe answer if asked how `onlyCurrentOwner` works.

---

## 87. Development Order — mapped to your remaining weeks

Do not build everything simultaneously. Follow this order, mapped onto the semester weeks already agreed:

| Weeks | Step | Definition of done |
|---|---|---|
| 3–4 | Finalise architecture (this document); scaffold Hardhat, backend, and frontend projects; write the Solidity struct/enum/function skeleton | `npx hardhat test` runs against stubs; Next.js app boots with all routes present |
| 5–7 | Implement real contract logic for every function in Section 44, with tests from Section 83 | A script walks one product from `MANUFACTURED` to `SOLD` on local Hardhat |
| 8–9 | Backend: MongoDB models, JWT auth, blockchainService, all forward-flow routes | Postman can register, certify, transfer, receive, and sell end-to-end |
| 10–11 | Frontend: dashboards for all 5 roles, `/verify` page, manual Product-ID entry | A teammate with no context can register and verify a product through the UI alone |
| 12 | Full return workflow, inspection outcomes | The full forward → sold → return → inspected → refurbished path works once, end-to-end, on video |
| 13 | Deploy to Sepolia, connect MetaMask, polish, write final report and demo video | A live Sepolia transaction is visible on a public block explorer |
| 14 | Final presentation | — |

---

## 88. MVP — What Must Work

```text
✓ Manufacturer registration
✓ Product creation
✓ Certifier certification
✓ QR generation
✓ Product transfer (both hops)
✓ Distributor / Retailer receiving
✓ Product sale
✓ Customer verification (/verify, manual entry)
✓ Blockchain history (immutable, append-only)
✓ Role-based authorization actually rejecting the wrong caller
✓ Non-returnable products structurally blocked from the return flow
✓ Returnable products: full request → accept → reverse-transfer → receive → inspect → resolve
```

**If Week 12 arrives and the full reverse chain isn't done:** ship the forward flow perfectly, with the return workflow implemented through `acceptReturn()` only (customer → retailer). A complete forward chain plus a partial-but-real return step is a stronger demo than a shaky full reverse chain — say so explicitly in the report rather than hiding it.

---

## 89. Features to Add Only After MVP

```text
Camera-based QR scanner (manual entry covers the same demo)
IPFS / real certificate file storage
Product images
Suspicious-product / unauthorized-reseller detection (Section 56)
IoT sensors, temperature tracking, GPS/cold-chain monitoring
AI anomaly / fraud detection
Analytics dashboards, notifications, email
Multiple simultaneous return cycles / reselling a refurbished item a second time
Mobile application
NFT-based product identity
Multi-organisation blockchain network
```

Do not start with these — the core blockchain workflow must work first.

---

## 90. Recommended Demo Scenario

Prepare two products for the final presentation.

**Product A — non-returnable**
```text
Return Eligible: NO
```
Workflow: Manufacturer → Certifier → Distributor → Retailer → Customer. On `/verify`, the return option is structurally absent — show that, don't just say it.

**Product B — returnable**
```text
Return Eligible: YES
Return Period: 30 days
```
Workflow: Manufacturer → Certifier → Distributor → Retailer → Customer → Return → Retailer → Distributor → Manufacturer → Refurbished → Distributor → Retailer → Customer (sold again, still labeled `REFURBISHED`).

This single second demo demonstrates almost every important feature in the system.

---

## 91. Final Demo Story

Use this narrative when presenting:

> A manufacturer creates a product. The blockchain generates a unique product identity. A certifier reviews and certifies its quality before it can leave the manufacturer. A QR code is generated and attached to the physical product. The manufacturer transfers it to a distributor, who scans the QR and confirms receipt — only after receiving can the distributor forward it. The retailer receives the product and sells it. The customer scans the QR and verifies its authenticity and complete history. If the product is return eligible, the customer can initiate a return. The retailer receives and confirms the return, and the product travels backward through the supply chain. The manufacturer receives and inspects it, marking it refurbished, restocked, damaged, or disposed. The complete lifecycle — forward and reverse — remains permanently visible on the blockchain.

---

## 92. Core Business Rules

These rules must never be violated.

1. Every product has a unique Product ID.
2. Every registered product receives a QR identity.
3. The QR code does not change during the product lifecycle.
4. The QR code does not contain the complete product history.
5. Blockchain stores important lifecycle events.
6. A product must be certified by the Certifier before it can leave the manufacturer.
7. Only authorised roles can perform their respective actions.
8. Only the current owner can transfer a product.
9. A receiver must confirm receipt before forwarding.
10. Non-returnable products cannot enter the return workflow.
11. Return eligibility is fixed at product registration.
12. Return periods must be respected when enabled.
13. Customer personal information is never required for the supply-chain workflow.
14. Returned products retain their complete previous history.
15. Returned products are not automatically considered new.
16. Product condition must reflect the return/refurbishment lifecycle.
17. Blockchain history cannot be edited or deleted.
18. Disposed products remain in the blockchain history.
19. Frontend validation is not a security mechanism.
20. Important authorization and state validation must happen in Solidity.
21. Blockchain is the source of truth for critical lifecycle information.
22. Commercially sensitive data (pricing, contract terms) never touches the chain.

---

## 93. What AI Assistants Must Know Before Modifying This Project

Any AI assistant working on this repository must read this README first. The AI must **not**:

- Change the supply-chain workflow without asking
- Remove blockchain functionality
- Replace Solidity with a plain database "for simplicity"
- Remove the Certifier role or the certification gate
- Store customer personal information unnecessarily
- Make QR codes dynamic per owner
- Allow unauthorized transfers or forwarding before receiving
- Allow returns for non-returnable products
- Delete product history, or reset returned products to `NEW`
- Move critical blockchain validation only into the frontend
- Reintroduce Hyperledger Fabric or another stack without discussion
- Rewrite working modules unnecessarily
- Change smart-contract state names without checking all dependent frontend/backend code

---

## 94. AI Development Rules

When asked to modify the project, follow this order:

**First** — read this README.
**Second** — understand the current architecture, state machine, contract, APIs, and database models by inspecting the actual files.
**Third** — make the smallest change required.
**Fourth** — check whether the change affects the smart contract, backend, frontend, database, QR workflow, or state transitions.
**Fifth** — update every related file, not just the one directly asked about.
**Sixth** — run tests/build before declaring the task complete.

---

## 95. Do Not Make Assumptions

If something is unclear, do not invent a new architecture. For example, if an AI sees `ProductStatus.RETAILER_RECEIVED`, it should not rename it to `ProductStatus.READY_TO_SELL` without checking the entire project. State names, contract function names, and data structures are shared dependencies across three codebases (contract, backend, frontend) — a silent rename in one breaks the other two.

---

## 96. Source of Truth Priority

When information conflicts:

```text
1. Smart Contract / Blockchain    — highest authority for product lifecycle
2. Backend logic
3. MongoDB cache
4. Frontend state                 — lowest authority
```

---

## 97. Current Project Scope

This is a **college/academic prototype**. It is not initially intended to handle:

```text
Real financial payments
Real customer identity verification
Real-world legal/regulatory compliance
Production pharmaceutical or food-safety regulations
Large-scale enterprise blockchain infrastructure
```

The system should demonstrate the concept clearly and correctly, on a public testnet, at prototype scale.

---

## 98. Future Expansion

The architecture allows future additions such as:

```text
IoT sensor data, temperature monitoring, cold-chain monitoring, GPS tracking
IPFS document storage for real certificate files
Digital certificate hashes tied to certification events
AI anomaly / fraud detection
Multi-organisation blockchain network (a return to something Fabric-like, if ever needed)
Mobile application
Batch-level tracking
NFT-based product identity
Automated notifications
```

These are future extensions and must not complicate the MVP.

---

## 99. Final Architecture Summary

```text
                     ┌──────────────┐
                     │   CUSTOMER   │  (no login, no wallet)
                     │ QR verify /  │
                     │ return req.  │
                     └──────┬───────┘
                            ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ MANUFACTURER │───→│  CERTIFIER   │───→│  BLOCKCHAIN  │
│ (+ Supplier) │    │              │    │TraceChain.sol│
└──────────────┘    └──────────────┘    └──────┬───────┘
                                                 │
                            ┌────────────────────┼────────────────────┐
                            ↓                                         ↓
                    ┌──────────────┐                         ┌──────────────┐
                    │ DISTRIBUTOR  │────────────────────────→│   RETAILER   │
                    └──────────────┘                         └──────────────┘

                          Supporting infrastructure
              ┌──────────────────────────────────────┐
              │      Next.js frontend (one app)       │
              ├──────────────────────────────────────┤
              │      Node / Express backend            │
              ├──────────────────────────────────────┤
              │  MongoDB (off-chain application data)  │
              └──────────────────────────────────────┘
```

---

## 100. Non-Negotiable Core Workflow

```text
                    CREATE
                      ↓
                 MANUFACTURER
                      ↓
                   CERTIFY
                      ↓
                  CERTIFIER
                      ↓
                   TRANSFER
                      ↓
                 DISTRIBUTOR
                      ↓
                   RECEIVE
                      ↓
                   TRANSFER
                      ↓
                  RETAILER
                      ↓
                   RECEIVE
                      ↓
                    SELL
                      ↓
                  CUSTOMER
                      │
                      │
            ┌─────────┴─────────┐
            │                   │
       NON-RETURNABLE       RETURNABLE
            │                   │
            ↓                   ↓
        END OF FLOW       RETURN REQUEST
                                ↓
                         RETAILER ACCEPT
                                ↓
                           TRANSFER
                                ↓
                          DISTRIBUTOR
                                ↓
                            RECEIVE
                                ↓
                           TRANSFER
                                ↓
                         MANUFACTURER
                                ↓
                             INSPECT
                                ↓
                 ┌──────────────┼──────────────┐
                 ↓              ↓              ↓
              RESTOCK       REFURBISH       DISPOSE
```






