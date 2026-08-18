// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TraceChain {

    enum ProductStatus {
        MANUFACTURED,
        CERTIFIED,
        IN_TRANSIT,
        DISTRIBUTOR_RECEIVED,
        RETAILER_RECEIVED,
        SOLD,
        RETURN_REQUESTED,
        RETURNED_TO_RETAILER,
        RETURN_IN_TRANSIT,
        DISTRIBUTOR_RETURN_RECEIVED,
        MANUFACTURER_RETURN_RECEIVED,
        INSPECTED,
        RESTOCKED,
        REFURBISHED,
        DAMAGED,
        DISPOSED
    }

    enum ProductCondition {
        NEW,
        USED,
        RETURNED,
        REFURBISHED,
        DAMAGED,
        DISPOSED
    }

    struct Product {
        uint256 productId;
        string name;
        string category;
        string batchId;
        address manufacturer;
        address certifier;
        address currentOwner;
        address expectedReceiver;
        ProductStatus status;
        ProductCondition condition;
        bool returnEligible;
        uint256 returnPeriod;
        uint256 soldAt;
        uint256 manufacturingDate;
        uint256 expiryDate;
        string manufacturingLocation;
        bool exists;
    }

    struct HistoryEntry {
        address actor;
        string action;
        address from;
        address to;
        uint256 timestamp;
    }

    mapping(uint256 => Product) public products;
    mapping(uint256 => HistoryEntry[]) private productHistory;

    mapping(address => bool) public admins;
    mapping(address => bool) public manufacturers;
    mapping(address => bool) public certifiers;
    mapping(address => bool) public distributors;
    mapping(address => bool) public retailers;

    address public owner;

    event ProductCreated(uint256 indexed productId, address indexed manufacturer);
    event ProductCertified(uint256 indexed productId, address indexed certifier);
    event ProductTransferred(uint256 indexed productId, address indexed from, address indexed to);
    event ProductReceived(uint256 indexed productId, address indexed receiver);
    event ProductSold(uint256 indexed productId, address indexed retailer);
    event ReturnRequested(uint256 indexed productId);
    event ReturnAccepted(uint256 indexed productId, address indexed retailer);
    event ReturnTransferred(uint256 indexed productId, address indexed from, address indexed to);
    event ReturnReceived(uint256 indexed productId, address indexed receiver);
    event ProductInspected(uint256 indexed productId);
    event ProductRestocked(uint256 indexed productId);
    event ProductRefurbished(uint256 indexed productId);
    event ProductDamaged(uint256 indexed productId);
    event ProductDisposed(uint256 indexed productId);
    event RoleGranted(string role, address indexed account);
    event RoleRevoked(string role, address indexed account);

    modifier onlyAdmin() {
        require(admins[msg.sender], "Not admin");
        _;
    }

    modifier onlyManufacturer() {
        require(manufacturers[msg.sender], "Not manufacturer");
        _;
    }

    modifier onlyCertifier() {
        require(certifiers[msg.sender], "Not certifier");
        _;
    }

    modifier onlyDistributor() {
        require(distributors[msg.sender], "Not distributor");
        _;
    }

    modifier onlyRetailer() {
        require(retailers[msg.sender], "Not retailer");
        _;
    }

    modifier onlyCurrentOwner(uint256 productId) {
        require(products[productId].currentOwner == msg.sender, "Not current owner");
        _;
    }

    modifier productExists(uint256 productId) {
        require(products[productId].exists, "Product does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }

    function addAdmin(address account) external onlyAdmin {
        admins[account] = true;
        emit RoleGranted("ADMIN", account);
    }

    function removeAdmin(address account) external onlyAdmin {
        require(account != owner, "Cannot remove contract owner as admin");
        admins[account] = false;
        emit RoleRevoked("ADMIN", account);
    }

    function addManufacturer(address account) external onlyAdmin {
        manufacturers[account] = true;
        emit RoleGranted("MANUFACTURER", account);
    }

    function removeManufacturer(address account) external onlyAdmin {
        manufacturers[account] = false;
        emit RoleRevoked("MANUFACTURER", account);
    }

    function addCertifier(address account) external onlyAdmin {
        certifiers[account] = true;
        emit RoleGranted("CERTIFIER", account);
    }

    function removeCertifier(address account) external onlyAdmin {
        certifiers[account] = false;
        emit RoleRevoked("CERTIFIER", account);
    }

    function addDistributor(address account) external onlyAdmin {
        distributors[account] = true;
        emit RoleGranted("DISTRIBUTOR", account);
    }

    function removeDistributor(address account) external onlyAdmin {
        distributors[account] = false;
        emit RoleRevoked("DISTRIBUTOR", account);
    }

    function addRetailer(address account) external onlyAdmin {
        retailers[account] = true;
        emit RoleGranted("RETAILER", account);
    }

    function removeRetailer(address account) external onlyAdmin {
        retailers[account] = false;
        emit RoleRevoked("RETAILER", account);
    }

    function registerProduct(
        uint256 productId,
        string memory name,
        string memory category,
        string memory batchId,
        uint256 manufacturingDate,
        uint256 expiryDate,
        string memory manufacturingLocation,
        bool returnEligible,
        uint256 returnPeriod
    ) external onlyManufacturer {
        require(!products[productId].exists, "Product already exists");

        Product storage p = products[productId];
        p.productId = productId;
        p.name = name;
        p.category = category;
        p.batchId = batchId;
        p.manufacturer = msg.sender;
        p.certifier = address(0);
        p.currentOwner = msg.sender;
        p.expectedReceiver = address(0);
        p.status = ProductStatus.MANUFACTURED;
        p.condition = ProductCondition.NEW;
        p.returnEligible = returnEligible;
        p.returnPeriod = returnPeriod;
        p.soldAt = 0;
        p.manufacturingDate = manufacturingDate;
        p.expiryDate = expiryDate;
        p.manufacturingLocation = manufacturingLocation;
        p.exists = true;

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "PRODUCT_CREATED",
            from: address(0),
            to: msg.sender,
            timestamp: block.timestamp
        }));

        emit ProductCreated(productId, msg.sender);
    }

    function certifyProduct(uint256 productId) external onlyCertifier productExists(productId) {
        Product storage p = products[productId];
        require(p.status == ProductStatus.MANUFACTURED, "Product must be in MANUFACTURED status");

        p.certifier = msg.sender;
        p.status = ProductStatus.CERTIFIED;

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "PRODUCT_CERTIFIED",
            from: address(0),
            to: address(0),
            timestamp: block.timestamp
        }));

        emit ProductCertified(productId, msg.sender);
    }

    function transferProduct(
        uint256 productId,
        address to
    ) external productExists(productId) onlyCurrentOwner(productId) {
        Product storage p = products[productId];

        require(
            p.status == ProductStatus.CERTIFIED ||
            p.status == ProductStatus.DISTRIBUTOR_RECEIVED ||
            p.status == ProductStatus.RESTOCKED ||
            p.status == ProductStatus.REFURBISHED,
            "Product not in transferable status"
        );

        if (p.status == ProductStatus.CERTIFIED || p.status == ProductStatus.RESTOCKED || p.status == ProductStatus.REFURBISHED) {
            require(distributors[to], "Receiver must be an authorized distributor");
        } else if (p.status == ProductStatus.DISTRIBUTOR_RECEIVED) {
            require(retailers[to], "Receiver must be an authorized retailer");
        }

        p.expectedReceiver = to;
        p.status = ProductStatus.IN_TRANSIT;

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "PRODUCT_TRANSFERRED",
            from: msg.sender,
            to: to,
            timestamp: block.timestamp
        }));

        emit ProductTransferred(productId, msg.sender, to);
    }

    function receiveProduct(uint256 productId) external productExists(productId) {
        Product storage p = products[productId];
        require(p.status == ProductStatus.IN_TRANSIT, "Product is not in transit");
        require(p.expectedReceiver == msg.sender, "Caller is not the expected receiver");

        string memory action;

        if (distributors[msg.sender]) {
            p.status = ProductStatus.DISTRIBUTOR_RECEIVED;
            action = "DISTRIBUTOR_RECEIVED";
        } else if (retailers[msg.sender]) {
            p.status = ProductStatus.RETAILER_RECEIVED;
            action = "RETAILER_RECEIVED";
        } else {
            revert("Receiver does not have a valid role");
        }

        p.currentOwner = msg.sender;
        p.expectedReceiver = address(0);

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: action,
            from: p.currentOwner,
            to: msg.sender,
            timestamp: block.timestamp
        }));

        emit ProductReceived(productId, msg.sender);
    }

    function sellProduct(uint256 productId) external onlyRetailer productExists(productId) onlyCurrentOwner(productId) {
        Product storage p = products[productId];
        require(p.status == ProductStatus.RETAILER_RECEIVED, "Product must be in RETAILER_RECEIVED status");

        p.status = ProductStatus.SOLD;
        p.soldAt = block.timestamp;

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "PRODUCT_SOLD",
            from: msg.sender,
            to: address(0),
            timestamp: block.timestamp
        }));

        emit ProductSold(productId, msg.sender);
    }

    function requestReturn(uint256 productId) external productExists(productId) {
        Product storage p = products[productId];
        require(p.returnEligible, "Product is not eligible for return");
        require(p.status == ProductStatus.SOLD, "Product must be in SOLD status");
        require(p.returnPeriod == 0 || block.timestamp <= p.soldAt + p.returnPeriod, "Return period has expired");

        p.status = ProductStatus.RETURN_REQUESTED;

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "RETURN_REQUESTED",
            from: address(0),
            to: address(0),
            timestamp: block.timestamp
        }));

        emit ReturnRequested(productId);
    }

    function acceptReturn(uint256 productId) external onlyRetailer productExists(productId) onlyCurrentOwner(productId) {
        Product storage p = products[productId];
        require(p.status == ProductStatus.RETURN_REQUESTED, "Product must be in RETURN_REQUESTED status");

        p.status = ProductStatus.RETURNED_TO_RETAILER;
        p.condition = ProductCondition.RETURNED;

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "RETURN_ACCEPTED_BY_RETAILER",
            from: address(0),
            to: msg.sender,
            timestamp: block.timestamp
        }));

        emit ReturnAccepted(productId, msg.sender);
    }

    function transferReturn(uint256 productId, address to) external productExists(productId) onlyCurrentOwner(productId) {
        Product storage p = products[productId];

        require(
            p.status == ProductStatus.RETURNED_TO_RETAILER ||
            p.status == ProductStatus.DISTRIBUTOR_RETURN_RECEIVED,
            "Product not in reverse-transferable status"
        );

        if (p.status == ProductStatus.RETURNED_TO_RETAILER) {
            require(distributors[to], "Receiver must be an authorized distributor");
        } else if (p.status == ProductStatus.DISTRIBUTOR_RETURN_RECEIVED) {
            require(manufacturers[to], "Receiver must be an authorized manufacturer");
        }

        p.expectedReceiver = to;
        p.status = ProductStatus.RETURN_IN_TRANSIT;

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "RETURN_TRANSFERRED",
            from: msg.sender,
            to: to,
            timestamp: block.timestamp
        }));

        emit ReturnTransferred(productId, msg.sender, to);
    }

    function receiveReturn(uint256 productId) external productExists(productId) {
        Product storage p = products[productId];
        require(p.status == ProductStatus.RETURN_IN_TRANSIT, "Product is not in return transit");
        require(p.expectedReceiver == msg.sender, "Caller is not the expected receiver");

        string memory action;

        if (distributors[msg.sender]) {
            p.status = ProductStatus.DISTRIBUTOR_RETURN_RECEIVED;
            action = "DISTRIBUTOR_RECEIVED_RETURN";
        } else if (manufacturers[msg.sender]) {
            p.status = ProductStatus.MANUFACTURER_RETURN_RECEIVED;
            action = "MANUFACTURER_RECEIVED_RETURN";
        } else {
            revert("Receiver does not have a valid role");
        }

        p.currentOwner = msg.sender;
        p.expectedReceiver = address(0);

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: action,
            from: p.currentOwner,
            to: msg.sender,
            timestamp: block.timestamp
        }));

        emit ReturnReceived(productId, msg.sender);
    }

    function inspectAndResolve(uint256 productId, string memory outcome) external onlyManufacturer productExists(productId) onlyCurrentOwner(productId) {
        Product storage p = products[productId];
        require(p.status == ProductStatus.MANUFACTURER_RETURN_RECEIVED, "Product must be in MANUFACTURER_RETURN_RECEIVED status");

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "INSPECTED",
            from: address(0),
            to: address(0),
            timestamp: block.timestamp
        }));

        emit ProductInspected(productId);

        bytes32 outcomeHash = keccak256(abi.encodePacked(outcome));

        if (outcomeHash == keccak256(abi.encodePacked("RESTOCKED"))) {
            p.status = ProductStatus.RESTOCKED;
            p.condition = ProductCondition.NEW;
            productHistory[productId].push(HistoryEntry({
                actor: msg.sender,
                action: "RESTOCKED",
                from: address(0),
                to: address(0),
                timestamp: block.timestamp
            }));
            emit ProductRestocked(productId);
        } else if (outcomeHash == keccak256(abi.encodePacked("REFURBISHED"))) {
            p.status = ProductStatus.REFURBISHED;
            p.condition = ProductCondition.REFURBISHED;
            productHistory[productId].push(HistoryEntry({
                actor: msg.sender,
                action: "REFURBISHED",
                from: address(0),
                to: address(0),
                timestamp: block.timestamp
            }));
            emit ProductRefurbished(productId);
        } else if (outcomeHash == keccak256(abi.encodePacked("DAMAGED"))) {
            p.status = ProductStatus.DAMAGED;
            p.condition = ProductCondition.DAMAGED;
            productHistory[productId].push(HistoryEntry({
                actor: msg.sender,
                action: "DAMAGED",
                from: address(0),
                to: address(0),
                timestamp: block.timestamp
            }));
            emit ProductDamaged(productId);
        } else if (outcomeHash == keccak256(abi.encodePacked("DISPOSED"))) {
            p.status = ProductStatus.DISPOSED;
            p.condition = ProductCondition.DISPOSED;
            productHistory[productId].push(HistoryEntry({
                actor: msg.sender,
                action: "DISPOSED",
                from: address(0),
                to: address(0),
                timestamp: block.timestamp
            }));
            emit ProductDisposed(productId);
        } else {
            revert("Invalid inspection outcome");
        }
    }

    function getProduct(uint256 productId) external view productExists(productId) returns (Product memory) {
        return products[productId];
    }

    function getHistory(uint256 productId) external view productExists(productId) returns (HistoryEntry[] memory) {
        return productHistory[productId];
    }

    function verifyProduct(uint256 productId) external view productExists(productId) returns (Product memory, HistoryEntry[] memory) {
        return (products[productId], productHistory[productId]);
    }
}