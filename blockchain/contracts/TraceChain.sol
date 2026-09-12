// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TraceChain
 * @notice Enterprise-grade supply chain traceability smart contract with full
 *         forward and reverse lifecycle management, role-based access control,
 *         and immutable audit history.
 * @dev Deployed on an Ethereum-compatible EVM (Hardhat local node / testnet).
 *      Every state-mutating function enforces strict access control via
 *      modifiers, and every transition appends an immutable HistoryEntry.
 */
contract TraceChain {

    // ──────────────────────────────────────────────
    //  Enums
    // ──────────────────────────────────────────────

    /// @notice 16-state lifecycle covering forward chain, sale, return flow,
    ///         inspection, and terminal dispositions.
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

    /// @notice Physical condition of the product, updated during returns and
    ///         inspection resolution.
    enum ProductCondition {
        NEW,
        USED,
        RETURNED,
        REFURBISHED,
        DAMAGED,
        DISPOSED
    }

    // ──────────────────────────────────────────────
    //  Structs
    // ──────────────────────────────────────────────

    struct Product {
        uint256 productId;
        string name;
        string category;
        string batchId;
        uint256 manufacturingDate;
        uint256 expiryDate;
        string manufacturingLocation;
        bool returnEligible;
        uint256 returnPeriod;
        ProductStatus status;
        ProductCondition condition;
        address currentOwner;
        address expectedReceiver;
        address manufacturer;
        address certifier;
        uint256 soldAt;
        bool exists;
    }

    /// @notice Immutable audit-trail entry appended on every state transition.
    struct HistoryEntry {
        string action;
        address actor;
        address from;
        address to;
        uint256 timestamp;
    }

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    mapping(uint256 => Product) private products;
    mapping(uint256 => HistoryEntry[]) private productHistory;

    mapping(address => bool) public admins;
    mapping(address => bool) public manufacturers;
    mapping(address => bool) public certifiers;
    mapping(address => bool) public distributors;
    mapping(address => bool) public retailers;

    /// @notice Immutable contract deployer — cannot be removed from the admin set.
    address public owner;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event ProductCreated(uint256 indexed productId, address indexed manufacturer);
    event ProductCertified(uint256 indexed productId, address indexed certifier);
    event ProductTransferred(uint256 indexed productId, address indexed from, address indexed to);
    event ProductReceived(uint256 indexed productId, address indexed receiver);
    event ProductSold(uint256 indexed productId, address indexed retailer);

    event RoleGranted(string role, address indexed account);
    event RoleRevoked(string role, address indexed account);

    event ReturnRequested(uint256 indexed productId);
    event ReturnAccepted(uint256 indexed productId, address indexed retailer);

    event ProductInspected(uint256 indexed productId);
    event ProductRestocked(uint256 indexed productId);
    event ProductRefurbished(uint256 indexed productId);
    event ProductDamaged(uint256 indexed productId);
    event ProductDisposed(uint256 indexed productId);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyAdmin() {
        require(admins[msg.sender], "Not admin");
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }

    // ═══════════════════════════════════════════════
    //  ROLE MANAGEMENT  (admin-only)
    // ═══════════════════════════════════════════════

    function addManufacturer(address _account) public onlyAdmin {
        manufacturers[_account] = true;
        emit RoleGranted("MANUFACTURER", _account);
    }

    function removeManufacturer(address _account) public onlyAdmin {
        manufacturers[_account] = false;
        emit RoleRevoked("MANUFACTURER", _account);
    }

    function addCertifier(address _account) public onlyAdmin {
        certifiers[_account] = true;
        emit RoleGranted("CERTIFIER", _account);
    }

    function addDistributor(address _account) public onlyAdmin {
        distributors[_account] = true;
        emit RoleGranted("DISTRIBUTOR", _account);
    }

    function addRetailer(address _account) public onlyAdmin {
        retailers[_account] = true;
        emit RoleGranted("RETAILER", _account);
    }

    function addAdmin(address _account) public onlyAdmin {
        admins[_account] = true;
        emit RoleGranted("ADMIN", _account);
    }

    function removeAdmin(address _account) public onlyAdmin {
        require(_account != owner, "Cannot remove contract owner as admin");
        admins[_account] = false;
        emit RoleRevoked("ADMIN", _account);
    }

    // ═══════════════════════════════════════════════
    //  FORWARD SUPPLY CHAIN
    // ═══════════════════════════════════════════════

    /**
     * @notice Register a new product.  Only authorised manufacturers may call.
     * @dev Sets status=MANUFACTURED, condition=NEW, currentOwner=msg.sender.
     */
    function registerProduct(
        uint256 _productId,
        string memory _name,
        string memory _category,
        string memory _batchId,
        uint256 _manufacturingDate,
        uint256 _expiryDate,
        string memory _manufacturingLocation,
        bool _returnEligible,
        uint256 _returnPeriod
    ) public {
        require(manufacturers[msg.sender], "Not manufacturer");
        require(!products[_productId].exists, "Product already exists");

        products[_productId] = Product({
            productId: _productId,
            name: _name,
            category: _category,
            batchId: _batchId,
            manufacturingDate: _manufacturingDate,
            expiryDate: _expiryDate,
            manufacturingLocation: _manufacturingLocation,
            returnEligible: _returnEligible,
            returnPeriod: _returnPeriod,
            status: ProductStatus.MANUFACTURED,
            condition: ProductCondition.NEW,
            currentOwner: msg.sender,
            expectedReceiver: address(0),
            manufacturer: msg.sender,
            certifier: address(0),
            soldAt: 0,
            exists: true
        });

        _addHistory(_productId, "PRODUCT_CREATED", msg.sender, address(0), address(0));
        emit ProductCreated(_productId, msg.sender);
    }

    /**
     * @notice Certify a product.  Only authorised certifiers may call.
     * @dev Product must be in MANUFACTURED status.
     */
    function certifyProduct(uint256 _productId) public {
        require(certifiers[msg.sender], "Not certifier");
        require(products[_productId].exists, "Product does not exist");
        require(
            products[_productId].status == ProductStatus.MANUFACTURED,
            "Product must be in MANUFACTURED status"
        );

        products[_productId].status = ProductStatus.CERTIFIED;
        products[_productId].certifier = msg.sender;

        _addHistory(_productId, "PRODUCT_CERTIFIED", msg.sender, address(0), address(0));
        emit ProductCertified(_productId, msg.sender);
    }

    /**
     * @notice Transfer a product to the next participant in the forward chain.
     * @dev Only the currentOwner may initiate. Enforces:
     *      - CERTIFIED / REFURBISHED / RESTOCKED → receiver must be a distributor
     *      - DISTRIBUTOR_RECEIVED               → receiver must be a retailer
     */
    function transferProduct(uint256 _productId, address _receiver) public {
        require(products[_productId].exists, "Product does not exist");
        require(products[_productId].currentOwner == msg.sender, "Not current owner");

        ProductStatus s = products[_productId].status;
        require(
            s == ProductStatus.CERTIFIED ||
            s == ProductStatus.DISTRIBUTOR_RECEIVED ||
            s == ProductStatus.REFURBISHED ||
            s == ProductStatus.RESTOCKED,
            "Product not in transferable status"
        );

        // Enforce correct receiver role for the current leg
        if (
            s == ProductStatus.CERTIFIED ||
            s == ProductStatus.REFURBISHED ||
            s == ProductStatus.RESTOCKED
        ) {
            require(distributors[_receiver], "Receiver must be an authorized distributor");
        } else if (s == ProductStatus.DISTRIBUTOR_RECEIVED) {
            require(retailers[_receiver], "Receiver must be an authorized retailer");
        }

        products[_productId].status = ProductStatus.IN_TRANSIT;
        products[_productId].expectedReceiver = _receiver;

        _addHistory(_productId, "PRODUCT_TRANSFERRED", msg.sender, msg.sender, _receiver);
        emit ProductTransferred(_productId, msg.sender, _receiver);
    }

    /**
     * @notice Confirm receipt of an in-transit product.
     * @dev Only the expectedReceiver may call.  Status is set to
     *      DISTRIBUTOR_RECEIVED or RETAILER_RECEIVED based on the caller's role.
     */
    function receiveProduct(uint256 _productId) public {
        require(products[_productId].exists, "Product does not exist");
        require(
            products[_productId].status == ProductStatus.IN_TRANSIT,
            "Product is not in transit"
        );
        require(
            products[_productId].expectedReceiver == msg.sender,
            "Caller is not the expected receiver"
        );

        products[_productId].currentOwner = msg.sender;
        products[_productId].expectedReceiver = address(0);

        if (distributors[msg.sender]) {
            products[_productId].status = ProductStatus.DISTRIBUTOR_RECEIVED;
            _addHistory(_productId, "DISTRIBUTOR_RECEIVED", msg.sender, address(0), address(0));
        } else if (retailers[msg.sender]) {
            products[_productId].status = ProductStatus.RETAILER_RECEIVED;
            _addHistory(_productId, "RETAILER_RECEIVED", msg.sender, address(0), address(0));
        }

        emit ProductReceived(_productId, msg.sender);
    }

    /**
     * @notice Mark a product as sold.  Only a retailer who is the current owner
     *         may call, and the product must be in RETAILER_RECEIVED status.
     */
    function sellProduct(uint256 _productId) public {
        require(retailers[msg.sender], "Not retailer");
        require(products[_productId].exists, "Product does not exist");
        require(products[_productId].currentOwner == msg.sender, "Not current owner");
        require(
            products[_productId].status == ProductStatus.RETAILER_RECEIVED,
            "Product must be in RETAILER_RECEIVED status"
        );

        products[_productId].status = ProductStatus.SOLD;
        products[_productId].soldAt = block.timestamp;

        _addHistory(_productId, "PRODUCT_SOLD", msg.sender, address(0), address(0));
        emit ProductSold(_productId, msg.sender);
    }

    // ═══════════════════════════════════════════════
    //  REVERSE SUPPLY CHAIN  (Returns)
    // ═══════════════════════════════════════════════

    /**
     * @notice Request a return.  Any address may call (simulates customer).
     * @dev Product must be SOLD and return-eligible.
     */
    function requestReturn(uint256 _productId) public {
        require(products[_productId].exists, "Product does not exist");
        require(
            products[_productId].status == ProductStatus.SOLD,
            "Product must be in SOLD status"
        );
        require(products[_productId].returnEligible, "Product is not eligible for return");

        products[_productId].status = ProductStatus.RETURN_REQUESTED;

        _addHistory(_productId, "RETURN_REQUESTED", msg.sender, address(0), address(0));
        emit ReturnRequested(_productId);
    }

    /**
     * @notice Retailer accepts a return request.
     * @dev Product must be in RETURN_REQUESTED status.
     */
    function acceptReturn(uint256 _productId) public {
        require(retailers[msg.sender], "Not retailer");
        require(products[_productId].exists, "Product does not exist");
        require(
            products[_productId].status == ProductStatus.RETURN_REQUESTED,
            "Product must be in RETURN_REQUESTED status"
        );

        products[_productId].status = ProductStatus.RETURNED_TO_RETAILER;
        products[_productId].condition = ProductCondition.RETURNED;

        _addHistory(_productId, "RETURN_ACCEPTED", msg.sender, address(0), address(0));
        emit ReturnAccepted(_productId, msg.sender);
    }

    /**
     * @notice Ship a returned product backward through the supply chain.
     * @dev Only the currentOwner may call.  Valid from RETURNED_TO_RETAILER or
     *      DISTRIBUTOR_RETURN_RECEIVED.
     */
    function transferReturn(uint256 _productId, address _receiver) public {
        require(products[_productId].exists, "Product does not exist");
        require(products[_productId].currentOwner == msg.sender, "Not current owner");

        ProductStatus s = products[_productId].status;
        require(
            s == ProductStatus.RETURNED_TO_RETAILER ||
            s == ProductStatus.DISTRIBUTOR_RETURN_RECEIVED,
            "Product not in returnable status"
        );

        products[_productId].status = ProductStatus.RETURN_IN_TRANSIT;
        products[_productId].expectedReceiver = _receiver;

        _addHistory(_productId, "RETURN_TRANSFERRED", msg.sender, msg.sender, _receiver);
    }

    /**
     * @notice Confirm receipt of a returned product.
     * @dev Only the expectedReceiver may call.  Status becomes
     *      DISTRIBUTOR_RETURN_RECEIVED or MANUFACTURER_RETURN_RECEIVED based on role.
     */
    function receiveReturn(uint256 _productId) public {
        require(products[_productId].exists, "Product does not exist");
        require(
            products[_productId].status == ProductStatus.RETURN_IN_TRANSIT,
            "Product is not in return transit"
        );
        require(
            products[_productId].expectedReceiver == msg.sender,
            "Caller is not the expected receiver"
        );

        products[_productId].currentOwner = msg.sender;
        products[_productId].expectedReceiver = address(0);

        if (distributors[msg.sender]) {
            products[_productId].status = ProductStatus.DISTRIBUTOR_RETURN_RECEIVED;
            _addHistory(_productId, "DISTRIBUTOR_RETURN_RECEIVED", msg.sender, address(0), address(0));
        } else if (manufacturers[msg.sender]) {
            products[_productId].status = ProductStatus.MANUFACTURER_RETURN_RECEIVED;
            _addHistory(_productId, "MANUFACTURER_RETURN_RECEIVED", msg.sender, address(0), address(0));
        }
    }

    /**
     * @notice Manufacturer inspects a returned product and resolves its fate.
     * @param _outcome One of: "RESTOCKED", "REFURBISHED", "DAMAGED", "DISPOSED".
     */
    function inspectAndResolve(uint256 _productId, string memory _outcome) public {
        require(manufacturers[msg.sender], "Not manufacturer");
        require(products[_productId].exists, "Product does not exist");
        require(
            products[_productId].status == ProductStatus.MANUFACTURER_RETURN_RECEIVED,
            "Product must be in MANUFACTURER_RETURN_RECEIVED status"
        );

        emit ProductInspected(_productId);

        bytes32 h = keccak256(abi.encodePacked(_outcome));

        if (h == keccak256(abi.encodePacked("RESTOCKED"))) {
            products[_productId].status = ProductStatus.RESTOCKED;
            products[_productId].condition = ProductCondition.NEW;
            _addHistory(_productId, "RESTOCKED", msg.sender, address(0), address(0));
            emit ProductRestocked(_productId);
        } else if (h == keccak256(abi.encodePacked("REFURBISHED"))) {
            products[_productId].status = ProductStatus.REFURBISHED;
            products[_productId].condition = ProductCondition.REFURBISHED;
            _addHistory(_productId, "REFURBISHED", msg.sender, address(0), address(0));
            emit ProductRefurbished(_productId);
        } else if (h == keccak256(abi.encodePacked("DAMAGED"))) {
            products[_productId].status = ProductStatus.DAMAGED;
            products[_productId].condition = ProductCondition.DAMAGED;
            _addHistory(_productId, "DAMAGED", msg.sender, address(0), address(0));
            emit ProductDamaged(_productId);
        } else if (h == keccak256(abi.encodePacked("DISPOSED"))) {
            products[_productId].status = ProductStatus.DISPOSED;
            products[_productId].condition = ProductCondition.DISPOSED;
            _addHistory(_productId, "DISPOSED", msg.sender, address(0), address(0));
            emit ProductDisposed(_productId);
        } else {
            revert("Invalid inspection outcome");
        }
    }

    // ═══════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════

    function getProduct(uint256 _productId) public view returns (Product memory) {
        require(products[_productId].exists, "Product does not exist");
        return products[_productId];
    }

    function getHistory(uint256 _productId) public view returns (HistoryEntry[] memory) {
        require(products[_productId].exists, "Product does not exist");
        return productHistory[_productId];
    }

    function verifyProduct(uint256 _productId) public view returns (Product memory, HistoryEntry[] memory) {
        require(products[_productId].exists, "Product does not exist");
        return (products[_productId], productHistory[_productId]);
    }

    // ──────────────────────────────────────────────
    //  Internal Helpers
    // ──────────────────────────────────────────────

    function _addHistory(
        uint256 _productId,
        string memory _action,
        address _actor,
        address _from,
        address _to
    ) internal {
        productHistory[_productId].push(HistoryEntry({
            action: _action,
            actor: _actor,
            from: _from,
            to: _to,
            timestamp: block.timestamp
        }));
    }
}