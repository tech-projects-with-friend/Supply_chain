/**
 * TraceChain Sepolia Smart Contract Configuration
 */

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x51c6486073368843f9824475eAB61e2e5e699239";

export const TRACECHAIN_ABI = [
  // Forward Supply Chain
  "function registerProduct(uint256 _productId, string _name, string _category, string _batchId, uint256 _manufacturingDate, uint256 _expiryDate, string _manufacturingLocation, bool _returnEligible, uint256 _returnPeriod) public",
  "function certifyProduct(uint256 _productId) public",
  "function transferProduct(uint256 _productId, address _to) public",
  "function receiveProduct(uint256 _productId) public",
  "function sellProduct(uint256 _productId) public",

  // Reverse Supply Chain
  "function requestReturn(uint256 _productId) public",
  "function acceptReturn(uint256 _productId) public",
  "function transferReturn(uint256 _productId, address _to) public",
  "function receiveReturn(uint256 _productId) public",
  "function inspectAndResolve(uint256 _productId, string _outcome) public",

  // Views
  "function getProduct(uint256 _productId) public view returns (tuple(uint256 productId, string name, string category, string batchId, uint256 manufacturingDate, uint256 expiryDate, string manufacturingLocation, bool returnEligible, uint256 returnPeriod, uint8 status, uint8 condition, address currentOwner, address expectedReceiver, address manufacturer, address certifier, uint256 soldAt, bool exists))",
  "function getHistory(uint256 _productId) public view returns (tuple(string action, address actor, address from, address to, uint256 timestamp)[])",

  // Role Checks
  "function isManufacturer(address _account) public view returns (bool)",
  "function isCertifier(address _account) public view returns (bool)",
  "function isDistributor(address _account) public view returns (bool)",
  "function isRetailer(address _account) public view returns (bool)",
  "function isAdmin(address _account) public view returns (bool)",

  // Events
  "event ProductCreated(uint256 indexed productId, address indexed manufacturer)",
  "event ProductCertified(uint256 indexed productId, address indexed certifier)",
  "event ProductTransferred(uint256 indexed productId, address indexed from, address indexed to)",
  "event ProductReceived(uint256 indexed productId, address indexed receiver)",
  "event ProductSold(uint256 indexed productId, address indexed retailer)"
];
