# Blockchain-Based Supply Chain Management System

## 1. Project Overview

This project is a **blockchain-based supply chain tracking and product verification system** built using **Ethereum-compatible blockchain technology and Solidity smart contracts**.

The system tracks a product throughout its complete supply-chain lifecycle:

```text
Manufacturer
     ↓
Distributor
     ↓
Retailer
     ↓
Customer
```

For products that are eligible for returns, the system also supports a controlled reverse supply chain:

```text
Customer
     ↓
Retailer
     ↓
Distributor
     ↓
Manufacturer
```

The system uses a **permanent QR code attached to each product**.

The QR code identifies the product. It does **not** contain or store the complete product history.

When the QR code is scanned, the application retrieves the product's current status and blockchain history.

---

# 2. Main Objective

The main objective is to provide:

* Transparent product tracking
* Tamper-resistant supply-chain history
* Product authenticity verification
* Controlled ownership transfer
* Role-based supply-chain operations
* QR-based product identification
* Return tracking for eligible products
* Product condition tracking
* Complete forward and reverse supply-chain history
* Prevention of unauthorized product forwarding

The blockchain should act as the **trusted source for important product lifecycle events**.

---

# 3. Core Concept

The most important concept in the project is:

> **The QR code identifies the product, while the blockchain records the product's lifecycle.**

The physical QR code does not change when the product moves.

Example:

```text
QR Code
   ↓
Product ID: PROD-000001
   ↓
Blockchain
   ↓
Current Owner
Current Status
Product Condition
Complete History
```

The same QR remains attached to the product throughout its lifecycle.

---

# 4. Example Product Lifecycle

For a normal non-returnable product:

```text
MANUFACTURED
      ↓
IN TRANSIT
      ↓
DISTRIBUTOR RECEIVED
      ↓
IN TRANSIT
      ↓
RETAILER RECEIVED
      ↓
SOLD
```

For a returnable product:

```text
MANUFACTURED
      ↓
IN TRANSIT
      ↓
DISTRIBUTOR RECEIVED
      ↓
IN TRANSIT
      ↓
RETAILER RECEIVED
      ↓
SOLD
      ↓
RETURN REQUESTED
      ↓
RETURNED TO RETAILER
      ↓
IN TRANSIT
      ↓
DISTRIBUTOR RECEIVED
      ↓
IN TRANSIT
      ↓
MANUFACTURER RECEIVED
      ↓
INSPECTED
      ↓
RESTOCKED / REFURBISHED / DAMAGED / DISPOSED
```

The reverse process only exists when:

```text
returnEligible == true
```

---

# 5. Technology Stack

## Frontend

Use:

```text
Next.js
React
TypeScript
Tailwind CSS
```

The frontend handles:

* User interface
* Dashboards
* Product registration
* Product transfer
* Product receiving
* Product verification
* QR generation
* QR scanning
* Return workflows
* Blockchain transaction interaction

---

## Backend

Use:

```text
Node.js
Express.js
TypeScript or JavaScript
MongoDB
Mongoose
JWT
```

The backend handles:

* Authentication
* User management
* Role management
* Application-level APIs
* MongoDB operations
* Supporting off-chain information
* Blockchain event synchronization where required

---

## Blockchain

Use:

```text
Ethereum-compatible blockchain
Solidity
Hardhat
ethers.js
MetaMask
```

For development/testing, use an Ethereum-compatible test network.

Do NOT use real cryptocurrency or mainnet during development.

---

## Database

Use:

```text
MongoDB
```

MongoDB should store application data that does not need to be permanently stored on-chain.

---

## QR

Use a QR-code library to generate QR codes.

The QR should contain either:

```text
Product ID
```

or preferably:

```text
https://YOUR_DOMAIN/verify/PRODUCT_ID
```

Example:

```text
https://supplychain.example/verify/PROD-000001
```

---

# 6. Why Blockchain Is Used

Blockchain is used for information that should be difficult to modify after recording.

Examples:

* Product creation
* Product ownership transfer
* Product receipt
* Product sale
* Return request
* Return acceptance
* Reverse transfer
* Manufacturer inspection
* Product condition changes
* Product lifecycle history

The blockchain should provide:

```text
Transparency
Traceability
Tamper resistance
Decentralized verification
```

---

# 7. Why MongoDB Is Also Used

Not everything belongs on a blockchain.

MongoDB can store:

* User accounts
* User names
* User emails
* Password hashes
* Role information
* UI-specific data
* Product descriptions
* Product images
* Search indexes
* Application metadata

Sensitive or unnecessary customer information should NOT be stored on-chain.

---

# 8. Customer Privacy Rule

The project does **NOT require customer details** for product tracking.

Do NOT require or store:

```text
Customer name
Customer phone
Customer address
Customer email
Customer personal information
```

The customer can interact with the product using its QR code.

The system only needs to know the product's blockchain lifecycle.

For example:

```text
Product:
PROD-000001

Status:
SOLD

No customer identity is required.
```

If a return occurs, the system records the return event but does not need to identify the customer.

---

# 9. User Roles

The project has four primary roles.

```text
ADMIN
MANUFACTURER
DISTRIBUTOR
RETAILER
```

The customer is treated primarily as a product verifier/return requester rather than a supply-chain organization.

---

# 10. Manufacturer Responsibilities

Manufacturer can:

* Register products
* Set product information
* Set whether the product is return eligible
* Set return period if applicable
* Generate product QR
* Transfer products to distributors
* Receive returned products
* Inspect returned products
* Mark returned products as:

  * Restocked
  * Refurbished
  * Damaged
  * Disposed

Manufacturer cannot:

* Modify historical blockchain records
* Modify another organization's ownership
* Pretend to receive a product that is not assigned to them
* Create a return for a non-returnable product

---

# 11. Distributor Responsibilities

Distributor can:

* Receive products from manufacturer
* View product history
* Transfer products to retailer
* Receive returned products from retailer
* Transfer returned products back to manufacturer

Distributor cannot:

* Register products
* Modify product creation information
* Mark a product as refurbished
* Mark a product as disposed
* Transfer a product before receiving it

---

# 12. Retailer Responsibilities

Retailer can:

* Receive products from distributors
* View product history
* Sell products
* Accept eligible returned products
* Transfer returned products to distributor

Retailer cannot:

* Register products
* Change manufacturer information
* Mark products as refurbished
* Mark products as disposed
* Forward a product before receiving it

---

# 13. Customer Responsibilities

Customer can:

* Scan QR
* Verify authenticity
* View product history
* View current product status
* Request a return if the product is return eligible

Customer does NOT:

* Become a blockchain supply-chain owner
* Change product ownership directly
* Modify product history
* Change product condition
* Receive authorization to forward the product

---

# 14. Product Registration

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

The manufacturer clicks:

```text
REGISTER PRODUCT
```

The application:

```text
Generate Product ID
       ↓
Create blockchain transaction
       ↓
Smart contract creates product
       ↓
Transaction confirmed
       ↓
Generate QR
       ↓
Display QR for printing
```

---

# 15. Product ID

Every product must have a unique identifier.

Example:

```text
PROD-2026-000001
PROD-2026-000002
PROD-2026-000003
```

The Product ID must be unique.

It is the primary identifier used throughout the application.

The QR references this Product ID.

---

# 16. QR Code Design

The QR code should NOT contain the entire product history.

Recommended QR content:

```text
https://YOUR_DOMAIN/verify/PROD-2026-000001
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

The physical QR code remains unchanged.

---

# 17. QR Lifecycle

The manufacturer generates the QR after product registration.

Example:

```text
Manufacturer registers:

Product ID:
PROD-2026-000001

System generates:

https://YOUR_DOMAIN/verify/PROD-2026-000001

QR is generated.

Manufacturer prints QR.

QR is attached to physical product.
```

The same QR is used by:

```text
Distributor
Retailer
Customer
```

throughout the lifecycle.

---

# 18. Important QR Rule

The QR code itself does NOT represent ownership.

It only represents:

```text
Product Identity
```

Ownership is determined by the blockchain.

Therefore:

```text
QR → Product ID
Product ID → Blockchain
Blockchain → Current Owner + Status + History
```

---

# 19. Product Data Structure

The core product structure should conceptually contain:

```text
Product
│
├── productId
├── name
├── category
├── batchId
├── manufacturer
├── currentOwner
├── status
├── condition
├── returnEligible
├── returnPeriod
├── manufacturingDate
├── expiryDate
├── manufacturingLocation
├── createdAt
└── history
```

---

# 20. Solidity Product Structure

The Solidity contract should use a structure conceptually similar to:

```solidity
struct Product {
    uint256 productId;
    string name;
    string category;
    string batchId;

    address manufacturer;
    address currentOwner;

    ProductStatus status;
    ProductCondition condition;

    bool returnEligible;
    uint256 returnPeriod;

    uint256 manufacturingDate;
    uint256 expiryDate;

    string manufacturingLocation;

    bool exists;
}
```

Do not copy this blindly. Adjust types and implementation during actual smart-contract development.

---

# 21. Product History Structure

Every important lifecycle event should be recorded.

Conceptually:

```solidity
struct History {
    address actor;
    ActionType action;
    address from;
    address to;
    uint256 timestamp;
    string location;
}
```

Example:

```text
Action:
PRODUCT_CREATED

Actor:
Manufacturer wallet

From:
None

To:
Manufacturer wallet

Timestamp:
13 Aug 2026
```

Another:

```text
Action:
PRODUCT_TRANSFERRED

From:
Manufacturer

To:
Distributor

Timestamp:
14 Aug 2026
```

---

# 22. Product Status

The smart contract should use an enum rather than arbitrary strings wherever practical.

Suggested statuses:

```text
MANUFACTURED
IN_TRANSIT
DISTRIBUTOR_RECEIVED
RETAILER_RECEIVED
SOLD

RETURN_REQUESTED
RETURNED_TO_RETAILER
RETURN_IN_TRANSIT_TO_DISTRIBUTOR
DISTRIBUTOR_RETURN_RECEIVED
RETURN_IN_TRANSIT_TO_MANUFACTURER
MANUFACTURER_RETURN_RECEIVED

INSPECTED
RESTOCKED
REFURBISHED
DAMAGED
DISPOSED
```

The exact names may be adjusted during implementation, but the state machine must remain consistent.

---

# 23. Product Condition

Product condition is separate from product status.

Suggested conditions:

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
status = SOLD
condition = NEW
```

After a return:

```text
status = RETURNED_TO_RETAILER
condition = RETURNED
```

After manufacturer refurbishment:

```text
status = REFURBISHED
condition = REFURBISHED
```

---

# 24. Return Eligibility

Every product must have:

```text
returnEligible
```

Example:

```text
returnEligible = true
```

or:

```text
returnEligible = false
```

This value is determined during product registration.

---

# 25. Non-Returnable Products

This is a strict business rule.

If:

```text
returnEligible == false
```

then:

* Customer cannot request a return
* Return button should not appear
* Return workflow should not be available
* Smart contract must reject return transactions
* Product should not enter a return state

Example:

```text
Product:
CUSTOM-001

Return Eligible:
NO

Status:
SOLD
```

There should be no:

```text
REQUEST RETURN
```

option.

---

# 26. Returnable Products

If:

```text
returnEligible == true
```

then the product can potentially enter the return workflow.

Example:

```text
Product:
LAP-001

Return Eligible:
YES

Return Period:
30 days

Status:
SOLD
```

The return option can be displayed if the return period is still valid.

---

# 27. Return Period

Return period is optional but recommended.

Example:

```text
returnPeriod = 30 days
```

The application can determine whether the product is still eligible based on the sale timestamp.

Conceptually:

```text
saleDate + returnPeriod >= currentTime
```

If true:

```text
Return Allowed
```

If false:

```text
Return Period Expired
```

The smart contract should ultimately enforce important return restrictions, not only the frontend.

---

# 28. Forward Supply Chain

The normal forward process is:

```text
MANUFACTURER
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

# 29. Critical Ownership Rule

A participant cannot transfer a product unless they are the current authorized owner.

Smart contract should enforce:

```solidity
require(
    products[productId].currentOwner == msg.sender,
    "Caller is not the current owner"
);
```

---

# 30. Critical Receiving Rule

A receiver must confirm receipt before they can forward the product.

Example:

```text
Manufacturer
     ↓
TRANSFER
     ↓
Distributor
```

After transfer:

```text
Distributor:
NOT YET RECEIVED
```

Distributor must perform:

```text
RECEIVE
```

Only after receiving:

```text
Distributor:
CURRENT OWNER
```

Then distributor can transfer.

This rule must be enforced by Solidity.

---

# 31. Never Depend Only on Frontend Validation

This is extremely important.

Bad implementation:

```javascript
if (status === "RECEIVED") {
    enableTransferButton();
}
```

This is useful for UI but is NOT security.

A malicious user could directly call the smart contract.

The smart contract itself must enforce:

```text
Correct caller
+
Correct current owner
+
Correct product status
+
Correct next state
=
Transaction allowed
```

---

# 32. Return Workflow

For returnable products:

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

# 33. Customer Return Request

Customer scans QR.

If:

```text
returnEligible == true
```

and the product is currently eligible for return:

```text
[ REQUEST RETURN ]
```

The system creates:

```text
RETURN_REQUESTED
```

No customer information is required.

---

# 34. Retailer Return Acceptance

Retailer receives the physical returned product.

Retailer scans QR.

The system displays:

```text
Product:
PROD-001

Return Status:
RETURN REQUESTED

[ ACCEPT RETURN ]
```

Retailer accepts.

Blockchain changes:

```text
RETURN_REQUESTED
       ↓
RETURNED_TO_RETAILER
```

Only now can retailer send it backward.

---

# 35. Retailer Cannot Forward Before Accepting Return

If retailer tries to forward the returned product without accepting it:

```text
Transaction rejected
```

The smart contract must enforce the state.

---

# 36. Distributor Return

Retailer transfers returned product to distributor.

Distributor must receive it.

Then:

```text
Distributor
     ↓
Transfer Return
     ↓
Manufacturer
```

Again, the distributor cannot forward until receiving it.

---

# 37. Manufacturer Return Inspection

Manufacturer receives returned product.

Manufacturer can inspect it.

Possible results:

```text
RESTOCKED
REFURBISHED
DAMAGED
DISPOSED
```

Example:

```text
RETURNED_TO_MANUFACTURER
        ↓
INSPECT
        ↓
REFURBISHED
```

The product is NOT reset to its original state.

---

# 38. Returned Product Never Loses History

This is a strict rule.

If a product was sold and returned:

```text
Manufactured
↓
Distributed
↓
Retailed
↓
Sold
↓
Returned
↓
Inspected
↓
Refurbished
```

The blockchain history remains.

It must never become:

```text
Manufactured
↓
Refurbished
```

without showing the previous lifecycle.

---

# 39. Product Can Be Sold Again

A returned product can potentially re-enter the supply chain.

Example:

```text
Manufacturer
     ↓
REFURBISHED
     ↓
Distributor
     ↓
Retailer
     ↓
SOLD AGAIN
```

Its condition remains:

```text
REFURBISHED
```

It should NOT become:

```text
NEW
```

unless the business rules explicitly allow that, which this project currently does not.

---

# 40. Product Lifecycle Example

Example:

```text
Product ID: LAP-001
```

### First lifecycle

```text
Manufacturer
     ↓
Distributor
     ↓
Retailer
     ↓
Customer
```

Blockchain history:

```text
1. CREATED
2. TRANSFERRED_TO_DISTRIBUTOR
3. DISTRIBUTOR_RECEIVED
4. TRANSFERRED_TO_RETAILER
5. RETAILER_RECEIVED
6. SOLD
```

### Return

```text
Customer
     ↓
Retailer
     ↓
Distributor
     ↓
Manufacturer
```

History:

```text
7. RETURN_REQUESTED
8. RETURN_ACCEPTED_BY_RETAILER
9. RETURNED_TO_DISTRIBUTOR
10. DISTRIBUTOR_RECEIVED_RETURN
11. RETURNED_TO_MANUFACTURER
12. MANUFACTURER_RECEIVED_RETURN
13. INSPECTED
14. REFURBISHED
```

### Second sale

```text
15. TRANSFERRED_TO_DISTRIBUTOR
16. DISTRIBUTOR_RECEIVED
17. TRANSFERRED_TO_RETAILER
18. RETAILER_RECEIVED
19. SOLD_AGAIN
```

Nothing is deleted.

---

# 41. Smart Contract Responsibilities

The smart contract is responsible for:

* Product creation
* Ownership
* State transitions
* Role authorization
* Return eligibility
* Return validation
* Product history
* Important timestamps
* Product condition
* Event emission

The smart contract should be the final authority for blockchain state.

---

# 42. Suggested Smart Contract Functions

The contract should eventually provide functions similar to:

```text
registerProduct()
transferProduct()
receiveProduct()

sellProduct()

requestReturn()
acceptReturn()

transferReturnedProduct()
receiveReturnedProduct()

inspectReturnedProduct()

restockProduct()
refurbishProduct()
markDamaged()
disposeProduct()

getProduct()
getProductHistory()
verifyProduct()
```

The exact function names may be changed during implementation, but functionality should remain equivalent.

---

# 43. Smart Contract Events

The contract should emit events for important actions.

Examples:

```solidity
ProductCreated
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

Events will allow the frontend/backend to track blockchain activity efficiently.

---

# 44. Role Authorization

The contract should maintain authorized wallet addresses.

Conceptually:

```text
Manufacturer addresses
Distributor addresses
Retailer addresses
Admin address
```

Only authorized addresses can perform role-specific actions.

Example:

```solidity
modifier onlyManufacturer()
modifier onlyDistributor()
modifier onlyRetailer()
modifier onlyAdmin()
```

Do not rely only on the backend role system.

Blockchain-level authorization is required for important operations.

---

# 45. Blockchain vs Backend Authentication

There are two different identities:

### Application identity

Handled by:

```text
JWT
MongoDB
Backend
```

Used for:

```text
Login
Dashboard
Application permissions
User profile
```

### Blockchain identity

Handled by:

```text
Wallet address
MetaMask
Smart contract
```

Used for:

```text
Blockchain transactions
Ownership
Blockchain role authorization
```

The application should connect the authenticated user's account with their authorized wallet address.

---

# 46. MongoDB User Structure

Conceptually:

```text
User
│
├── _id
├── name
├── email
├── passwordHash
├── role
├── walletAddress
└── createdAt
```

Possible roles:

```text
ADMIN
MANUFACTURER
DISTRIBUTOR
RETAILER
```

Do not store unnecessary customer information.

---

# 47. MongoDB Product Structure

MongoDB can maintain an off-chain representation for fast application access.

Conceptually:

```text
Product
│
├── productId
├── name
├── category
├── batchId
├── manufacturerAddress
├── currentOwnerAddress
├── status
├── condition
├── returnEligible
├── returnPeriod
├── manufacturingDate
├── expiryDate
├── manufacturingLocation
├── blockchainTxHash
├── qrUrl
└── createdAt
```

The blockchain remains authoritative for critical lifecycle information.

---

# 48. MongoDB Supply Chain Event

Optional off-chain event model:

```text
SupplyChainEvent
│
├── productId
├── action
├── actorAddress
├── fromAddress
├── toAddress
├── transactionHash
├── timestamp
└── location
```

This can be used for efficient dashboards and search.

---

# 49. Backend API Structure

Suggested REST API:

```text
/api/auth
/api/users
/api/products
/api/products/:id
/api/products/:id/history
/api/products/:id/verify
/api/products/:id/qr
/api/returns
/api/blockchain
```

---

# 50. Authentication APIs

Example:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

---

# 51. Product APIs

Example:

```text
POST /api/products
GET  /api/products/:id
GET  /api/products/:id/history
GET  /api/products/:id/verify
```

The actual blockchain transaction should occur through the appropriate blockchain service.

---

# 52. Return APIs

Example:

```text
POST /api/products/:id/return/request
POST /api/products/:id/return/accept
POST /api/products/:id/return/transfer
POST /api/products/:id/return/receive
```

Do not allow these APIs to bypass smart-contract rules.

---

# 53. Blockchain Service

Create a dedicated service:

```text
services/blockchainService.ts
```

Responsibilities:

```text
Connect to blockchain
Load contract
Read product
Create transactions
Wait for confirmation
Parse events
Return transaction hash
```

The rest of the backend should not contain raw blockchain logic everywhere.

---

# 54. Frontend Pages

Recommended pages:

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
│   └── [productId]
│
└── admin
    ├── users
    └── organizations
```

---

# 55. Product Verification Page

The main customer-facing page should be:

```text
/verify/[productId]
```

It should display:

```text
Product Name
Product ID
Batch ID
Manufacturer
Current Status
Current Condition
Return Eligibility
Manufacturing Date
Expiry Date
```

And most importantly:

```text
COMPLETE SUPPLY CHAIN TIMELINE
```

---

# 56. Verification Result

If product exists:

```text
✓ PRODUCT VERIFIED

Product ID:
PROD-2026-000001

Manufacturer:
ABC Manufacturing

Current Status:
RETAILER RECEIVED

Condition:
NEW
```

If product does not exist:

```text
✗ PRODUCT NOT VERIFIED

This product ID does not exist
on the blockchain.
```

---

# 57. Suspicious Product Detection

The system can optionally compare:

```text
Blockchain current owner
```

against:

```text
Retailer scanning the product
```

If they don't match:

```text
WARNING:
This product is not currently assigned
to this retailer.
```

This is useful for counterfeit or unauthorized-resale detection.

---

# 58. QR Generation Workflow

After successful product registration:

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

The QR should only be generated after successful registration.

Do not generate a final QR for a blockchain product that does not exist.

---

# 59. QR Scanning

There are two possible implementations.

### Option 1

Use phone camera to scan the QR.

### Option 2

Allow manual Product ID entry.

Both should be supported.

Example:

```text
[ Scan QR ]

or

Enter Product ID:
[ PROD-000001 ]

[ VERIFY ]
```

Manual entry is useful during development/testing.

---

# 60. Recommended Project Folder Structure

The complete project should use a monorepo-style structure:

```text
blockchain-supply-chain/
│
├── README.md
│
├── frontend/
│   ├── public/
│   │   └── ...
│   │
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
│   │   │   ├── distributor/
│   │   │   │   ├── products/
│   │   │   │   └── returns/
│   │   │   │
│   │   │   ├── retailer/
│   │   │   │   ├── products/
│   │   │   │   ├── sell/
│   │   │   │   └── returns/
│   │   │   │
│   │   │   └── verify/
│   │   │       └── [productId]/
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
│   │   │   └── ...
│   │   │
│   │   └── server.ts
│   │
│   ├── .env
│   └── package.json
│
├── blockchain/
│   ├── contracts/
│   │   └── SupplyChain.sol
│   │
│   ├── scripts/
│   │   └── deploy.ts
│   │
│   ├── test/
│   │   └── SupplyChain.test.ts
│   │
│   ├── ignition/
│   │   └── modules/
│   │       └── SupplyChain.ts
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

# 61. Environment Variables

Never commit secrets to GitHub.

Example backend `.env`:

```text
PORT=5000
MONGODB_URI=...
JWT_SECRET=...

BLOCKCHAIN_RPC_URL=...
CONTRACT_ADDRESS=...
```

Frontend:

```text
NEXT_PUBLIC_API_URL=...
NEXT_PUBLIC_CONTRACT_ADDRESS=...
NEXT_PUBLIC_CHAIN_ID=...
```

Blockchain:

```text
RPC_URL=...
PRIVATE_KEY=...
```

The private key must NEVER be committed to GitHub.

Use `.env` and `.gitignore`.

---

# 62. Smart Contract Architecture

The contract should contain:

```text
SupplyChain.sol
│
├── Roles
│
├── Product
│
├── History
│
├── ProductStatus
│
├── ProductCondition
│
├── ActionType
│
├── Product mapping
│
├── History mapping
│
├── Registration functions
│
├── Transfer functions
│
├── Receive functions
│
├── Sale functions
│
├── Return functions
│
├── Inspection functions
│
├── Verification functions
│
└── Events
```

---

# 63. Product Mapping

Conceptually:

```solidity
mapping(uint256 => Product) public products;
```

Product ID maps to product information.

---

# 64. Product History Mapping

Conceptually:

```solidity
mapping(uint256 => History[]) private productHistory;
```

Each product has an array of historical events.

---

# 65. Product Registration Logic

Pseudo-flow:

```text
registerProduct()
        ↓
Check caller is manufacturer
        ↓
Check Product ID doesn't exist
        ↓
Create Product
        ↓
currentOwner = manufacturer
        ↓
status = MANUFACTURED
        ↓
condition = NEW
        ↓
Set returnEligible
        ↓
Record history
        ↓
Emit ProductCreated
```

---

# 66. Transfer Logic

Pseudo-flow:

```text
transferProduct(productId, receiver)
        ↓
Check product exists
        ↓
Check caller == currentOwner
        ↓
Check current status allows transfer
        ↓
Check receiver has appropriate role
        ↓
currentOwner = receiver
        ↓
status = IN_TRANSIT
        ↓
Record history
        ↓
Emit ProductTransferred
```

---

# 67. Receive Logic

Pseudo-flow:

```text
receiveProduct(productId)
        ↓
Check product exists
        ↓
Check caller == expected receiver
        ↓
Check status == IN_TRANSIT
        ↓
status = RECEIVED
        ↓
currentOwner = caller
        ↓
Record history
        ↓
Emit ProductReceived
```

---

# 68. Sale Logic

Only retailer can sell.

Pseudo-flow:

```text
sellProduct(productId)
        ↓
Check caller is retailer
        ↓
Check caller is current owner
        ↓
Check product status == RETAILER_RECEIVED
        ↓
status = SOLD
        ↓
Record sale timestamp
        ↓
Record history
        ↓
Emit ProductSold
```

No customer information is required.

---

# 69. Return Request Logic

Pseudo-flow:

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

# 70. Return Acceptance Logic

Retailer accepts the physical returned product.

```text
acceptReturn(productId)
        ↓
Check caller is retailer
        ↓
Check product is assigned to retailer
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

# 71. Reverse Transfer Logic

Retailer:

```text
RETURNED_TO_RETAILER
        ↓
TRANSFER RETURN
        ↓
RETURN_IN_TRANSIT
```

Distributor:

```text
RETURN_IN_TRANSIT
        ↓
RECEIVE RETURN
        ↓
DISTRIBUTOR_RETURN_RECEIVED
```

Distributor:

```text
DISTRIBUTOR_RETURN_RECEIVED
        ↓
TRANSFER RETURN
        ↓
RETURN_IN_TRANSIT
```

Manufacturer:

```text
RETURN_IN_TRANSIT
        ↓
RECEIVE RETURN
        ↓
MANUFACTURER_RETURN_RECEIVED
```

---

# 72. Inspection Logic

Only manufacturer can inspect a returned product.

Possible actions:

```text
inspectReturnedProduct()
restockProduct()
refurbishProduct()
markDamaged()
disposeProduct()
```

The final condition must be recorded.

---

# 73. State Transition Rules

The state machine must prevent invalid transitions.

Valid forward flow:

```text
MANUFACTURED
→ IN_TRANSIT
→ DISTRIBUTOR_RECEIVED
→ IN_TRANSIT
→ RETAILER_RECEIVED
→ SOLD
```

Valid return flow:

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

After inspection:

```text
INSPECTED
→ RESTOCKED

INSPECTED
→ REFURBISHED

INSPECTED
→ DAMAGED

INSPECTED
→ DISPOSED
```

No arbitrary jumps should be permitted.

---

# 74. Important Security Rules

The smart contract must prevent:

```text
Unauthorized registration
Unauthorized transfer
Unauthorized receiving
Unauthorized selling
Unauthorized return acceptance
Unauthorized inspection
Unauthorized condition changes
Invalid state transitions
Return of non-returnable products
Transfer before receiving
```

---

# 75. Immutability Rule

Historical events must never be edited or deleted.

Do not implement functions like:

```text
deleteHistory()
editHistory()
deleteProductHistory()
```

The blockchain history must remain permanent.

If a mistake occurs, create a new corrective event rather than modifying an old event.

---

# 76. Product Deletion

Products should not be deleted from the blockchain.

If a product is no longer usable:

```text
condition = DISPOSED
status = DISPOSED
```

The history remains available.

---

# 77. Duplicate Product Prevention

A Product ID must never be registered twice.

Smart contract should check:

```text
product exists?
```

If yes:

```text
Transaction rejected.
```

---

# 78. Wallet Address Rules

Each manufacturer, distributor and retailer must have an authorized blockchain wallet.

Example:

```text
Manufacturer:
0xABC...

Distributor:
0xDEF...

Retailer:
0x123...
```

These addresses are used for blockchain authorization.

---

# 79. Transaction Hash

Every blockchain transaction should have a transaction hash.

Example:

```text
0x8a7c92...
```

The UI can display:

```text
Blockchain Transaction:
0x8a7c92...

[View on Blockchain Explorer]
```

This makes the project easier to demonstrate.

---

# 80. Frontend Blockchain Interaction

Use `ethers.js`.

Conceptually:

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

MetaMask signs blockchain transactions.

---

# 81. Backend Blockchain Interaction

The backend can use ethers.js for:

```text
Reading blockchain data
Listening to events
Synchronizing data
Server-side verification
```

Do not put a user's private wallet key in the frontend.

---

# 82. Database Principle

When blockchain and MongoDB contain overlapping information:

```text
Blockchain = source of truth
MongoDB = application/cache/index
```

For example, if MongoDB says:

```text
currentOwner = Retailer A
```

but blockchain says:

```text
currentOwner = Distributor B
```

the blockchain value wins.

The application should reconcile the database.

---

# 83. Error Handling

The frontend must display understandable errors.

Examples:

```text
You are not the current owner.

Product must be received before transfer.

This product is not eligible for return.

Return period has expired.

Only the manufacturer can inspect this product.

Product does not exist.

Invalid product state.

Unauthorized wallet.

Transaction rejected by user.

Blockchain transaction failed.
```

Do not display only raw Solidity errors to users.

---

# 84. Testing Requirements

The smart contract must be tested extensively.

Test:

```text
Product registration
Duplicate registration
Unauthorized registration
Forward transfer
Unauthorized transfer
Transfer before receiving
Correct receiving
Wrong receiver
Sale
Unauthorized sale
Return eligibility
Non-returnable return rejection
Expired return
Return request
Return acceptance
Reverse transfer
Reverse receiving
Manufacturer inspection
Refurbishment
Damage
Disposal
Invalid state transitions
```

---

# 85. Example Test

Test that distributor cannot forward before receiving.

```text
Manufacturer registers product
        ↓
Manufacturer transfers to distributor
        ↓
Distributor attempts transfer to retailer
        ↓
EXPECTED:
Transaction REVERTS
```

Then:

```text
Distributor receives
        ↓
Distributor transfers
        ↓
EXPECTED:
Transaction succeeds
```

---

# 86. Git Structure

Use Git from the beginning.

Repository:

```text
blockchain-supply-chain
```

Recommended branches:

```text
main
develop
feature/frontend
feature/backend
feature/blockchain
feature/qr
```

Do not directly experiment on `main`.

---

# 87. Team Responsibilities

For a four-member team:

### Member 1 — Frontend

Responsible for:

```text
Next.js
UI
Dashboards
Product pages
Verification page
QR interface
```

### Member 2 — Backend

Responsible for:

```text
Node.js
Express
MongoDB
Authentication
APIs
```

### Member 3 — Blockchain

Responsible for:

```text
Solidity
Hardhat
Smart contract
Roles
State machine
Testing
Deployment
```

### Member 4 — Integration

Responsible for:

```text
ethers.js
MetaMask
QR generation/scanning
Blockchain + backend integration
Testing
Deployment
```

All members must understand the complete architecture.

---

# 88. Development Order

Do NOT build everything simultaneously.

Follow this order:

```text
STEP 1
Finalize requirements
        ↓
STEP 2
Design architecture
        ↓
STEP 3
Design Solidity state machine
        ↓
STEP 4
Create Solidity contract
        ↓
STEP 5
Write contract tests
        ↓
STEP 6
Deploy contract locally/testnet
        ↓
STEP 7
Create backend
        ↓
STEP 8
Connect MongoDB
        ↓
STEP 9
Create authentication
        ↓
STEP 10
Connect backend/blockchain
        ↓
STEP 11
Create frontend
        ↓
STEP 12
Connect MetaMask
        ↓
STEP 13
Create QR generation
        ↓
STEP 14
Create QR verification
        ↓
STEP 15
Implement return workflow
        ↓
STEP 16
Integration testing
        ↓
STEP 17
Deployment
        ↓
STEP 18
Final demo
```

---

# 89. MVP

The minimum working project must support:

```text
✓ Manufacturer registration
✓ Product creation
✓ QR generation
✓ Product transfer
✓ Distributor receiving
✓ Distributor transfer
✓ Retailer receiving
✓ Product sale
✓ Customer verification
✓ Blockchain history
✓ Role-based authorization
✓ Non-returnable products
✓ Returnable products
✓ Return request
✓ Return acceptance
✓ Reverse supply chain
✓ Manufacturer inspection
✓ Product condition tracking
```

---

# 90. Features to Add Only After MVP

Optional advanced features:

```text
QR scanner
IPFS
Product images
IoT sensors
Temperature tracking
GPS
AI anomaly detection
Analytics
Notifications
Email
Advanced dashboards
```

Do not start with these.

The core blockchain workflow must work first.

---

# 91. Recommended Demo Scenario

For the final presentation, prepare two products.

## Product A — Non-returnable

```text
Product:
Custom Product A

Return Eligible:
NO
```

Workflow:

```text
Manufacturer
→ Distributor
→ Retailer
→ Customer
```

Customer scans QR.

Return option does not exist.

---

## Product B — Returnable

```text
Product:
Laptop B

Return Eligible:
YES
Return Period:
30 days
```

Workflow:

```text
Manufacturer
→ Distributor
→ Retailer
→ Customer
→ Return
→ Retailer
→ Distributor
→ Manufacturer
→ Refurbished
→ Distributor
→ Retailer
→ Customer
```

This single demo demonstrates almost every important feature.

---

# 92. Final Demo Story

The presentation should explain the project using this story:

```text
A manufacturer creates a product.

The blockchain generates a unique product identity.

A QR code is generated and attached to the physical product.

The manufacturer transfers it to a distributor.

The distributor scans the QR and confirms receipt.

Only after receiving the product can the distributor forward it.

The retailer receives the product and sells it.

The customer scans the QR and verifies its authenticity and complete history.

If the product is return eligible, the customer can initiate a return.

The retailer receives and confirms the return.

The product travels backward through the supply chain.

The manufacturer receives and inspects it.

The manufacturer can mark it as refurbished, restocked,
damaged or disposed.

The complete lifecycle remains permanently visible on the blockchain.
```

---

# 93. Core Business Rules

These rules must NEVER be violated.

### Rule 1

Every product has a unique Product ID.

### Rule 2

Every registered product receives a QR identity.

### Rule 3

The QR code does not change during the product lifecycle.

### Rule 4

The QR code does not contain the complete product history.

### Rule 5

Blockchain stores important lifecycle events.

### Rule 6

Only authorized roles can perform their respective actions.

### Rule 7

Only the current owner can transfer a product.

### Rule 8

A receiver must confirm receipt before forwarding.

### Rule 9

Non-returnable products cannot enter the return workflow.

### Rule 10

Return eligibility is determined during product registration.

### Rule 11

Return periods must be respected when enabled.

### Rule 12

Customer personal information is not required for the supply-chain workflow.

### Rule 13

Returned products retain their complete previous history.

### Rule 14

Returned products are not automatically considered new.

### Rule 15

Product condition must reflect the return/refurbishment lifecycle.

### Rule 16

Blockchain history cannot be edited or deleted.

### Rule 17

Disposed products remain in the blockchain history.

### Rule 18

Frontend validation is not a security mechanism.

### Rule 19

Important authorization and state validation must happen in Solidity.

### Rule 20

Blockchain is the source of truth for critical lifecycle information.

---

# 94. What AI Assistants Must Know Before Modifying This Project

Any AI assistant working on this repository must read this README before making changes.

The AI must NOT:

* Change the supply-chain workflow without asking
* Remove blockchain functionality
* Replace Solidity with a normal database
* Store customer personal information unnecessarily
* Make QR codes dynamic per owner
* Allow unauthorized transfers
* Allow forwarding before receiving
* Allow returns for non-returnable products
* Delete product history
* Reset returned products to NEW
* Move critical blockchain validation only into the frontend
* Introduce a completely different technology stack without discussion
* Rewrite working modules unnecessarily
* Change smart-contract state names without checking all dependent frontend/backend code

---

# 95. AI Development Rules

When an AI is asked to modify the project:

### First

Read:

```text
README.md
```

Then inspect the relevant existing files.

### Second

Understand:

```text
Current architecture
Current state machine
Current smart contract
Current APIs
Current database models
```

### Third

Make the smallest change required.

### Fourth

Check whether the change affects:

```text
Smart contract
Backend
Frontend
Database
QR workflow
State transitions
```

### Fifth

Update related files if necessary.

### Sixth

Run tests/build before declaring the task complete.

---

# 96. Do Not Make Assumptions

If something is unclear, do not invent a new architecture.

For example, if an AI sees:

```text
ProductStatus.RETAILER_RECEIVED
```

it should not rename it to:

```text
ProductStatus.READY_TO_SELL
```

without checking the entire project.

State names, contract function names and data structures are shared dependencies.

---

# 97. Source of Truth Priority

When information conflicts:

```text
1. Smart Contract / Blockchain
2. Backend logic
3. MongoDB cache
4. Frontend state
```

Blockchain has the highest authority for product lifecycle.

---

# 98. Current Project Scope

The project is currently intended as a **college/academic prototype**.

It is not initially intended to handle:

```text
Real financial payments
Real customer identity verification
Real-world legal compliance
Production pharmaceutical regulations
Large-scale enterprise blockchain infrastructure
```

The system should demonstrate the concept clearly and correctly.

---

# 99. Future Expansion

The architecture should allow future additions such as:

```text
IoT sensor data
Temperature monitoring
Cold-chain monitoring
GPS tracking
IPFS document storage
Digital certificates
AI anomaly detection
Fraud detection
Multi-organization blockchain networks
Mobile application
Batch-level tracking
NFT-based product identity
Automated notifications
```

These are future extensions and should not complicate the MVP.

---

# 100. Final Architecture Summary

The complete system is:

```text
                         ┌──────────────────┐
                         │     CUSTOMER     │
                         │ QR Verification  │
                         │ Return Request   │
                         └────────┬─────────┘
                                  │
                                  ↓
┌───────────────┐       ┌──────────────────┐
│ MANUFACTURER  │──────→│    BLOCKCHAIN    │←──────┐
└───────┬───────┘       │  SupplyChain.sol │       │
        │               └────────┬─────────┘       │
        │                        │                  │
        ↓                        ↓                  │
     QR Code              Product History           │
        │                        │                  │
        ↓                        ↓                  │
┌───────────────┐       ┌──────────────────┐       │
│  DISTRIBUTOR  │──────→│     RETAILER     │───────┘
└───────────────┘       └──────────────────┘

                Supporting Infrastructure

              ┌──────────────────────────┐
              │       Next.js            │
              │       Frontend           │
              └────────────┬─────────────┘
                           │
              ┌────────────↓─────────────┐
              │      Node / Express      │
              │         Backend          │
              └────────────┬─────────────┘
                           │
              ┌────────────↓─────────────┐
              │        MongoDB           │
              │   Off-chain application  │
              │          data            │
              └──────────────────────────┘
```

---

# 101. One-Sentence Project Definition

> **A blockchain-based supply-chain management system where every product receives a permanent QR-based identity, its ownership and lifecycle are recorded on an Ethereum-compatible blockchain, authorized participants must confirm receipt before forwarding products, and eligible returned products can travel backward through the supply chain while preserving their complete historical record.**

---

# 102. Non-Negotiable Core Workflow

The final system must fundamentally follow:

```text
                    CREATE
                      ↓
                 MANUFACTURER
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

**This state machine, authorization model, QR concept, and returnability rule form the core specification of the project. Any future implementation must preserve them unless the team explicitly decides to change the project requirements.**.
