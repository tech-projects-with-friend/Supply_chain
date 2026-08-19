import { ethers } from "ethers";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

const loadContractABI = (): ethers.InterfaceAbi => {
  const artifactPath = path.resolve(
    __dirname,
    "../../../blockchain/artifacts/contracts/TraceChain.sol/TraceChain.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Contract artifact not found at ${artifactPath}. Run 'npx hardhat compile' in the blockchain directory first.`
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  return artifact.abi;
};

const getProvider = (): ethers.JsonRpcProvider => {
  return new ethers.JsonRpcProvider(RPC_URL);
};

const getWallet = (): ethers.Wallet => {
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is not set in .env");
  }
  const provider = getProvider();
  return new ethers.Wallet(PRIVATE_KEY, provider);
};

const getContract = (): ethers.Contract => {
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS is not set in .env");
  }
  const abi = loadContractABI();
  const wallet = getWallet();
  return new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
};

const getReadOnlyContract = (): ethers.Contract => {
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS is not set in .env");
  }
  const abi = loadContractABI();
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
};

// Aliases to match your API route imports
const getContractWrite = getContract;
const getContractRead = getReadOnlyContract;

export {
  getProvider,
  getWallet,
  getContract,
  getReadOnlyContract,
  getContractWrite,
  getContractRead,
  loadContractABI,
  RPC_URL,
  CONTRACT_ADDRESS,
};