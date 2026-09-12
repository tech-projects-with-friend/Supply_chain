const hre = require("hardhat");

// ==============================================================================
// SEPOLIA CONTRACT ADDRESS PLACEHOLDER
// Paste your deployed TraceChain contract address here after deployment:
// ==============================================================================
const YOUR_SEPOLIA_CONTRACT_ADDRESS = "0x51c6486073368843f9824475eAB61e2e5e699239";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const contractAddress = YOUR_SEPOLIA_CONTRACT_ADDRESS;

    if (!contractAddress || contractAddress === "YOUR_SEPOLIA_CONTRACT_ADDRESS") {
        console.error(
            "❌ Error: Please set YOUR_SEPOLIA_CONTRACT_ADDRESS at the top of setupRoles.js to your deployed contract address."
        );
        process.exit(1);
    }

    console.log("Connecting to TraceChain at:", contractAddress);
    console.log("Granting enterprise roles using account:", deployer.address);

    const TraceChain = await hre.ethers.getContractAt("TraceChain", contractAddress);

    console.log("1/4 Granting Manufacturer role...");
    const tx1 = await TraceChain.addManufacturer(deployer.address);
    await tx1.wait();
    console.log("  ✓ Manufacturer granted");

    console.log("2/4 Granting Certifier role...");
    const tx2 = await TraceChain.addCertifier(deployer.address);
    await tx2.wait();
    console.log("  ✓ Certifier granted");

    console.log("3/4 Granting Distributor role...");
    const tx3 = await TraceChain.addDistributor(deployer.address);
    await tx3.wait();
    console.log("  ✓ Distributor granted");

    console.log("4/4 Granting Retailer role...");
    const tx4 = await TraceChain.addRetailer(deployer.address);
    await tx4.wait();
    console.log("  ✓ Retailer granted");

    console.log("\n✅ All enterprise roles granted successfully on Sepolia!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});