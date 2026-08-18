import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const PRODUCT_ID = 1;
const PRODUCT_NAME = "Laptop X1";
const PRODUCT_CATEGORY = "Electronics";
const BATCH_ID = "BATCH-2026-001";
const MFG_DATE = 1723939200;
const EXP_DATE = 1755475200;
const MFG_LOCATION = "Chennai, India";
const RETURN_PERIOD = 30 * 24 * 60 * 60;

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
    DISPOSED,
}

enum ProductCondition {
    NEW,
    USED,
    RETURNED,
    REFURBISHED,
    DAMAGED,
    DISPOSED,
}

async function deployFixture() {
    const [admin, manufacturer, certifier, distributor, retailer, customer, unauthorized] =
        await ethers.getSigners();

    const TraceChain = await ethers.getContractFactory("TraceChain");
    const traceChain = await TraceChain.deploy();
    await traceChain.waitForDeployment();

    await traceChain.connect(admin).addManufacturer(manufacturer.address);
    await traceChain.connect(admin).addCertifier(certifier.address);
    await traceChain.connect(admin).addDistributor(distributor.address);
    await traceChain.connect(admin).addRetailer(retailer.address);

    return { traceChain, admin, manufacturer, certifier, distributor, retailer, customer, unauthorized };
}

async function registerProductFixture() {
    const fixture = await deployFixture();
    const { traceChain, manufacturer } = fixture;

    await traceChain.connect(manufacturer).registerProduct(
        PRODUCT_ID, PRODUCT_NAME, PRODUCT_CATEGORY, BATCH_ID,
        MFG_DATE, EXP_DATE, MFG_LOCATION, true, RETURN_PERIOD
    );

    return fixture;
}

async function certifiedProductFixture() {
    const fixture = await registerProductFixture();
    const { traceChain, certifier } = fixture;
    await traceChain.connect(certifier).certifyProduct(PRODUCT_ID);
    return fixture;
}

async function distributorReceivedFixture() {
    const fixture = await certifiedProductFixture();
    const { traceChain, manufacturer, distributor } = fixture;
    await traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address);
    await traceChain.connect(distributor).receiveProduct(PRODUCT_ID);
    return fixture;
}

async function retailerReceivedFixture() {
    const fixture = await distributorReceivedFixture();
    const { traceChain, distributor, retailer } = fixture;
    await traceChain.connect(distributor).transferProduct(PRODUCT_ID, retailer.address);
    await traceChain.connect(retailer).receiveProduct(PRODUCT_ID);
    return fixture;
}

async function soldProductFixture() {
    const fixture = await retailerReceivedFixture();
    const { traceChain, retailer } = fixture;
    await traceChain.connect(retailer).sellProduct(PRODUCT_ID);
    return fixture;
}

describe("TraceChain", function () {

    describe("Deployment", function () {
        it("should deploy successfully and set deployer as admin", async function () {
            const { traceChain, admin } = await loadFixture(deployFixture);
            const address = await traceChain.getAddress();
            expect(address).to.be.properAddress;
            expect(await traceChain.admins(admin.address)).to.be.true;
            expect(await traceChain.owner()).to.equal(admin.address);
        });
    });

    describe("Role Management", function () {
        it("should allow admin to grant manufacturer role", async function () {
            const { traceChain, manufacturer } = await loadFixture(deployFixture);
            expect(await traceChain.manufacturers(manufacturer.address)).to.be.true;
        });

        it("should allow admin to grant certifier role", async function () {
            const { traceChain, certifier } = await loadFixture(deployFixture);
            expect(await traceChain.certifiers(certifier.address)).to.be.true;
        });

        it("should allow admin to grant distributor role", async function () {
            const { traceChain, distributor } = await loadFixture(deployFixture);
            expect(await traceChain.distributors(distributor.address)).to.be.true;
        });

        it("should allow admin to grant retailer role", async function () {
            const { traceChain, retailer } = await loadFixture(deployFixture);
            expect(await traceChain.retailers(retailer.address)).to.be.true;
        });

        it("should emit RoleGranted event when adding a role", async function () {
            const { traceChain, admin, unauthorized } = await loadFixture(deployFixture);
            await expect(traceChain.connect(admin).addManufacturer(unauthorized.address))
                .to.emit(traceChain, "RoleGranted")
                .withArgs("MANUFACTURER", unauthorized.address);
        });

        it("should allow admin to revoke a role", async function () {
            const { traceChain, admin, manufacturer } = await loadFixture(deployFixture);
            await traceChain.connect(admin).removeManufacturer(manufacturer.address);
            expect(await traceChain.manufacturers(manufacturer.address)).to.be.false;
        });

        it("should emit RoleRevoked event when removing a role", async function () {
            const { traceChain, admin, manufacturer } = await loadFixture(deployFixture);
            await expect(traceChain.connect(admin).removeManufacturer(manufacturer.address))
                .to.emit(traceChain, "RoleRevoked")
                .withArgs("MANUFACTURER", manufacturer.address);
        });

        it("should reject role assignment by non-admin", async function () {
            const { traceChain, unauthorized } = await loadFixture(deployFixture);
            await expect(
                traceChain.connect(unauthorized).addManufacturer(unauthorized.address)
            ).to.be.revertedWith("Not admin");
        });

        it("should reject role revocation by non-admin", async function () {
            const { traceChain, manufacturer } = await loadFixture(deployFixture);
            await expect(
                traceChain.connect(manufacturer).removeManufacturer(manufacturer.address)
            ).to.be.revertedWith("Not admin");
        });

        it("should allow admin to add another admin", async function () {
            const { traceChain, admin, unauthorized } = await loadFixture(deployFixture);
            await traceChain.connect(admin).addAdmin(unauthorized.address);
            expect(await traceChain.admins(unauthorized.address)).to.be.true;
        });

        it("should prevent removing the contract owner as admin", async function () {
            const { traceChain, admin } = await loadFixture(deployFixture);
            await expect(
                traceChain.connect(admin).removeAdmin(admin.address)
            ).to.be.revertedWith("Cannot remove contract owner as admin");
        });
    });

    describe("Product Registration", function () {
        it("should allow a manufacturer to register a product", async function () {
            const { traceChain, manufacturer } = await loadFixture(deployFixture);

            await expect(
                traceChain.connect(manufacturer).registerProduct(
                    PRODUCT_ID, PRODUCT_NAME, PRODUCT_CATEGORY, BATCH_ID,
                    MFG_DATE, EXP_DATE, MFG_LOCATION, true, RETURN_PERIOD
                )
            ).to.emit(traceChain, "ProductCreated").withArgs(PRODUCT_ID, manufacturer.address);

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.productId).to.equal(PRODUCT_ID);
            expect(product.name).to.equal(PRODUCT_NAME);
            expect(product.category).to.equal(PRODUCT_CATEGORY);
            expect(product.batchId).to.equal(BATCH_ID);
            expect(product.manufacturer).to.equal(manufacturer.address);
            expect(product.currentOwner).to.equal(manufacturer.address);
            expect(product.status).to.equal(ProductStatus.MANUFACTURED);
            expect(product.condition).to.equal(ProductCondition.NEW);
            expect(product.returnEligible).to.be.true;
            expect(product.returnPeriod).to.equal(RETURN_PERIOD);
            expect(product.manufacturingDate).to.equal(MFG_DATE);
            expect(product.expiryDate).to.equal(EXP_DATE);
            expect(product.manufacturingLocation).to.equal(MFG_LOCATION);
            expect(product.exists).to.be.true;
        });

        it("should record a history entry on registration", async function () {
            const { traceChain, manufacturer } = await loadFixture(registerProductFixture);
            const history = await traceChain.getHistory(PRODUCT_ID);
            expect(history.length).to.equal(1);
            expect(history[0].action).to.equal("PRODUCT_CREATED");
            expect(history[0].actor).to.equal(manufacturer.address);
        });

        it("should register a non-returnable product", async function () {
            const { traceChain, manufacturer } = await loadFixture(deployFixture);
            await traceChain.connect(manufacturer).registerProduct(
                PRODUCT_ID, PRODUCT_NAME, PRODUCT_CATEGORY, BATCH_ID,
                MFG_DATE, EXP_DATE, MFG_LOCATION, false, 0
            );
            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.returnEligible).to.be.false;
            expect(product.returnPeriod).to.equal(0);
        });

        it("should reject duplicate product registration", async function () {
            const { traceChain, manufacturer } = await loadFixture(registerProductFixture);
            await expect(
                traceChain.connect(manufacturer).registerProduct(
                    PRODUCT_ID, PRODUCT_NAME, PRODUCT_CATEGORY, BATCH_ID,
                    MFG_DATE, EXP_DATE, MFG_LOCATION, true, RETURN_PERIOD
                )
            ).to.be.revertedWith("Product already exists");
        });

        it("should reject registration by a non-manufacturer", async function () {
            const { traceChain, distributor } = await loadFixture(deployFixture);
            await expect(
                traceChain.connect(distributor).registerProduct(
                    PRODUCT_ID, PRODUCT_NAME, PRODUCT_CATEGORY, BATCH_ID,
                    MFG_DATE, EXP_DATE, MFG_LOCATION, true, RETURN_PERIOD
                )
            ).to.be.revertedWith("Not manufacturer");
        });

        it("should reject registration by a certifier", async function () {
            const { traceChain, certifier } = await loadFixture(deployFixture);
            await expect(
                traceChain.connect(certifier).registerProduct(
                    PRODUCT_ID, PRODUCT_NAME, PRODUCT_CATEGORY, BATCH_ID,
                    MFG_DATE, EXP_DATE, MFG_LOCATION, true, RETURN_PERIOD
                )
            ).to.be.revertedWith("Not manufacturer");
        });

        it("should reject registration by a retailer", async function () {
            const { traceChain, retailer } = await loadFixture(deployFixture);
            await expect(
                traceChain.connect(retailer).registerProduct(
                    PRODUCT_ID, PRODUCT_NAME, PRODUCT_CATEGORY, BATCH_ID,
                    MFG_DATE, EXP_DATE, MFG_LOCATION, true, RETURN_PERIOD
                )
            ).to.be.revertedWith("Not manufacturer");
        });

        it("should reject registration by an unauthorized address", async function () {
            const { traceChain, unauthorized } = await loadFixture(deployFixture);
            await expect(
                traceChain.connect(unauthorized).registerProduct(
                    PRODUCT_ID, PRODUCT_NAME, PRODUCT_CATEGORY, BATCH_ID,
                    MFG_DATE, EXP_DATE, MFG_LOCATION, true, RETURN_PERIOD
                )
            ).to.be.revertedWith("Not manufacturer");
        });
    });

    describe("Product Certification", function () {
        it("should allow a certifier to certify a manufactured product", async function () {
            const { traceChain, certifier } = await loadFixture(registerProductFixture);

            await expect(traceChain.connect(certifier).certifyProduct(PRODUCT_ID))
                .to.emit(traceChain, "ProductCertified")
                .withArgs(PRODUCT_ID, certifier.address);

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.CERTIFIED);
            expect(product.certifier).to.equal(certifier.address);
        });

        it("should record a history entry on certification", async function () {
            const { traceChain, certifier } = await loadFixture(certifiedProductFixture);
            const history = await traceChain.getHistory(PRODUCT_ID);
            expect(history.length).to.equal(2);
            expect(history[1].action).to.equal("PRODUCT_CERTIFIED");
            expect(history[1].actor).to.equal(certifier.address);
        });

        it("should reject certification by a non-certifier", async function () {
            const { traceChain, manufacturer } = await loadFixture(registerProductFixture);
            await expect(
                traceChain.connect(manufacturer).certifyProduct(PRODUCT_ID)
            ).to.be.revertedWith("Not certifier");
        });

        it("should reject certification of a non-existent product", async function () {
            const { traceChain, certifier } = await loadFixture(deployFixture);
            await expect(
                traceChain.connect(certifier).certifyProduct(999)
            ).to.be.revertedWith("Product does not exist");
        });

        it("should reject certification of an already certified product", async function () {
            const { traceChain, certifier } = await loadFixture(certifiedProductFixture);
            await expect(
                traceChain.connect(certifier).certifyProduct(PRODUCT_ID)
            ).to.be.revertedWith("Product must be in MANUFACTURED status");
        });

        it("should reject certification of a product in IN_TRANSIT status", async function () {
            const { traceChain, manufacturer, certifier, distributor } =
                await loadFixture(certifiedProductFixture);
            await traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address);
            await expect(
                traceChain.connect(certifier).certifyProduct(PRODUCT_ID)
            ).to.be.revertedWith("Product must be in MANUFACTURED status");
        });
    });

    describe("Product Transfer", function () {
        it("should allow manufacturer to transfer certified product to distributor", async function () {
            const { traceChain, manufacturer, distributor } = await loadFixture(certifiedProductFixture);

            await expect(
                traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address)
            )
                .to.emit(traceChain, "ProductTransferred")
                .withArgs(PRODUCT_ID, manufacturer.address, distributor.address);

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.IN_TRANSIT);
            expect(product.expectedReceiver).to.equal(distributor.address);
        });

        it("should allow distributor to transfer received product to retailer", async function () {
            const { traceChain, distributor, retailer } = await loadFixture(distributorReceivedFixture);

            await expect(
                traceChain.connect(distributor).transferProduct(PRODUCT_ID, retailer.address)
            )
                .to.emit(traceChain, "ProductTransferred")
                .withArgs(PRODUCT_ID, distributor.address, retailer.address);

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.IN_TRANSIT);
            expect(product.expectedReceiver).to.equal(retailer.address);
        });

        it("should reject transfer before certification", async function () {
            const { traceChain, manufacturer, distributor } = await loadFixture(registerProductFixture);
            await expect(
                traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address)
            ).to.be.revertedWith("Product not in transferable status");
        });

        it("should reject transfer by non-owner", async function () {
            const { traceChain, distributor, retailer } = await loadFixture(certifiedProductFixture);
            await expect(
                traceChain.connect(distributor).transferProduct(PRODUCT_ID, retailer.address)
            ).to.be.revertedWith("Not current owner");
        });

        it("should reject transfer of certified product to a retailer directly", async function () {
            const { traceChain, manufacturer, retailer } = await loadFixture(certifiedProductFixture);
            await expect(
                traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, retailer.address)
            ).to.be.revertedWith("Receiver must be an authorized distributor");
        });

        it("should reject transfer of distributor-received product to another distributor", async function () {
            const { traceChain, admin, distributor } = await loadFixture(distributorReceivedFixture);
            const [, , , , , , , otherDistributor] = await ethers.getSigners();
            await traceChain.connect(admin).addDistributor(otherDistributor.address);
            await expect(
                traceChain.connect(distributor).transferProduct(PRODUCT_ID, otherDistributor.address)
            ).to.be.revertedWith("Receiver must be an authorized retailer");
        });

        it("should reject transfer to an unauthorized address", async function () {
            const { traceChain, manufacturer, unauthorized } = await loadFixture(certifiedProductFixture);
            await expect(
                traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, unauthorized.address)
            ).to.be.revertedWith("Receiver must be an authorized distributor");
        });

        it("should reject transfer of non-existent product", async function () {
            const { traceChain, manufacturer, distributor } = await loadFixture(deployFixture);
            await expect(
                traceChain.connect(manufacturer).transferProduct(999, distributor.address)
            ).to.be.revertedWith("Product does not exist");
        });

        it("should reject distributor transferring before receiving", async function () {
            const { traceChain, manufacturer, distributor, retailer } =
                await loadFixture(certifiedProductFixture);
            await traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address);
            await expect(
                traceChain.connect(distributor).transferProduct(PRODUCT_ID, retailer.address)
            ).to.be.revertedWith("Not current owner");
        });

        it("should record history entry on transfer", async function () {
            const { traceChain, manufacturer, distributor } = await loadFixture(certifiedProductFixture);
            await traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address);
            const history = await traceChain.getHistory(PRODUCT_ID);
            const lastEntry = history[history.length - 1];
            expect(lastEntry.action).to.equal("PRODUCT_TRANSFERRED");
            expect(lastEntry.from).to.equal(manufacturer.address);
            expect(lastEntry.to).to.equal(distributor.address);
        });
    });

    describe("Product Receiving", function () {
        it("should allow distributor to receive an in-transit product", async function () {
            const { traceChain, manufacturer, distributor } = await loadFixture(certifiedProductFixture);
            await traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address);

            await expect(traceChain.connect(distributor).receiveProduct(PRODUCT_ID))
                .to.emit(traceChain, "ProductReceived")
                .withArgs(PRODUCT_ID, distributor.address);

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.DISTRIBUTOR_RECEIVED);
            expect(product.currentOwner).to.equal(distributor.address);
            expect(product.expectedReceiver).to.equal(ethers.ZeroAddress);
        });

        it("should allow retailer to receive an in-transit product", async function () {
            const { traceChain, distributor, retailer } = await loadFixture(distributorReceivedFixture);
            await traceChain.connect(distributor).transferProduct(PRODUCT_ID, retailer.address);

            await expect(traceChain.connect(retailer).receiveProduct(PRODUCT_ID))
                .to.emit(traceChain, "ProductReceived")
                .withArgs(PRODUCT_ID, retailer.address);

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.RETAILER_RECEIVED);
            expect(product.currentOwner).to.equal(retailer.address);
        });

        it("should reject receive by wrong receiver", async function () {
            const { traceChain, manufacturer, distributor, retailer } =
                await loadFixture(certifiedProductFixture);
            await traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address);
            await expect(
                traceChain.connect(retailer).receiveProduct(PRODUCT_ID)
            ).to.be.revertedWith("Caller is not the expected receiver");
        });

        it("should reject receive when product is not in transit", async function () {
            const { traceChain, manufacturer } = await loadFixture(registerProductFixture);
            await expect(
                traceChain.connect(manufacturer).receiveProduct(PRODUCT_ID)
            ).to.be.revertedWith("Product is not in transit");
        });

        it("should reject receive by an unauthorized address", async function () {
            const { traceChain, manufacturer, distributor, unauthorized } =
                await loadFixture(certifiedProductFixture);
            await traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address);
            await expect(
                traceChain.connect(unauthorized).receiveProduct(PRODUCT_ID)
            ).to.be.revertedWith("Caller is not the expected receiver");
        });

        it("should record history entry on receive", async function () {
            const { traceChain, distributor } = await loadFixture(distributorReceivedFixture);
            const history = await traceChain.getHistory(PRODUCT_ID);
            const lastEntry = history[history.length - 1];
            expect(lastEntry.action).to.equal("DISTRIBUTOR_RECEIVED");
            expect(lastEntry.actor).to.equal(distributor.address);
        });
    });

    describe("Product Sale", function () {
        it("should allow retailer to sell a received product", async function () {
            const { traceChain, retailer } = await loadFixture(retailerReceivedFixture);

            await expect(traceChain.connect(retailer).sellProduct(PRODUCT_ID))
                .to.emit(traceChain, "ProductSold")
                .withArgs(PRODUCT_ID, retailer.address);

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.SOLD);
            expect(product.soldAt).to.be.greaterThan(0);
        });

        it("should reject sale by non-retailer", async function () {
            const { traceChain, distributor } = await loadFixture(retailerReceivedFixture);
            await expect(
                traceChain.connect(distributor).sellProduct(PRODUCT_ID)
            ).to.be.revertedWith("Not retailer");
        });

        it("should reject sale by retailer who is not current owner", async function () {
            const { traceChain, admin, distributor } = await loadFixture(distributorReceivedFixture);
            const [, , , , , , , , otherRetailer] = await ethers.getSigners();
            await traceChain.connect(admin).addRetailer(otherRetailer.address);
            await expect(
                traceChain.connect(otherRetailer).sellProduct(PRODUCT_ID)
            ).to.be.revertedWith("Not current owner");
        });

        it("should reject sale when product is not in RETAILER_RECEIVED status", async function () {
            const { traceChain, manufacturer, admin } = await loadFixture(registerProductFixture);
            await traceChain.connect(admin).addRetailer(manufacturer.address);
            await expect(
                traceChain.connect(manufacturer).sellProduct(PRODUCT_ID)
            ).to.be.revertedWith("Product must be in RETAILER_RECEIVED status");
        });

        it("should reject sale of product still at distributor", async function () {
            const { traceChain, admin, distributor } = await loadFixture(distributorReceivedFixture);
            await traceChain.connect(admin).addRetailer(distributor.address);
            await expect(
                traceChain.connect(distributor).sellProduct(PRODUCT_ID)
            ).to.be.revertedWith("Product must be in RETAILER_RECEIVED status");
        });

        it("should record history entry on sale", async function () {
            const { traceChain, retailer } = await loadFixture(soldProductFixture);
            const history = await traceChain.getHistory(PRODUCT_ID);
            const lastEntry = history[history.length - 1];
            expect(lastEntry.action).to.equal("PRODUCT_SOLD");
            expect(lastEntry.actor).to.equal(retailer.address);
        });
    });

    describe("Full Forward Supply Chain Lifecycle", function () {
        it("should transition from MANUFACTURED to SOLD through all states", async function () {
            const { traceChain, manufacturer, certifier, distributor, retailer } =
                await loadFixture(deployFixture);

            await traceChain.connect(manufacturer).registerProduct(
                PRODUCT_ID, PRODUCT_NAME, PRODUCT_CATEGORY, BATCH_ID,
                MFG_DATE, EXP_DATE, MFG_LOCATION, false, 0
            );
            let product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.MANUFACTURED);

            await traceChain.connect(certifier).certifyProduct(PRODUCT_ID);
            product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.CERTIFIED);

            await traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address);
            product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.IN_TRANSIT);

            await traceChain.connect(distributor).receiveProduct(PRODUCT_ID);
            product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.DISTRIBUTOR_RECEIVED);

            await traceChain.connect(distributor).transferProduct(PRODUCT_ID, retailer.address);
            product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.IN_TRANSIT);

            await traceChain.connect(retailer).receiveProduct(PRODUCT_ID);
            product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.RETAILER_RECEIVED);

            await traceChain.connect(retailer).sellProduct(PRODUCT_ID);
            product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.SOLD);
            expect(product.condition).to.equal(ProductCondition.NEW);
        });

        it("should accumulate a complete history through the forward chain", async function () {
            const { traceChain } = await loadFixture(soldProductFixture);
            const history = await traceChain.getHistory(PRODUCT_ID);
            expect(history.length).to.equal(7);
            expect(history[0].action).to.equal("PRODUCT_CREATED");
            expect(history[1].action).to.equal("PRODUCT_CERTIFIED");
            expect(history[2].action).to.equal("PRODUCT_TRANSFERRED");
            expect(history[3].action).to.equal("DISTRIBUTOR_RECEIVED");
            expect(history[4].action).to.equal("PRODUCT_TRANSFERRED");
            expect(history[5].action).to.equal("RETAILER_RECEIVED");
            expect(history[6].action).to.equal("PRODUCT_SOLD");
        });
    });

    describe("View Functions", function () {
        it("should return product via getProduct", async function () {
            const { traceChain } = await loadFixture(registerProductFixture);
            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.name).to.equal(PRODUCT_NAME);
            expect(product.exists).to.be.true;
        });

        it("should return history via getHistory", async function () {
            const { traceChain } = await loadFixture(registerProductFixture);
            const history = await traceChain.getHistory(PRODUCT_ID);
            expect(history.length).to.equal(1);
        });

        it("should return both product and history via verifyProduct", async function () {
            const { traceChain } = await loadFixture(certifiedProductFixture);
            const [product, history] = await traceChain.verifyProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.CERTIFIED);
            expect(history.length).to.equal(2);
        });

        it("should revert getProduct for non-existent product", async function () {
            const { traceChain } = await loadFixture(deployFixture);
            await expect(traceChain.getProduct(999)).to.be.revertedWith("Product does not exist");
        });

        it("should revert getHistory for non-existent product", async function () {
            const { traceChain } = await loadFixture(deployFixture);
            await expect(traceChain.getHistory(999)).to.be.revertedWith("Product does not exist");
        });

        it("should revert verifyProduct for non-existent product", async function () {
            const { traceChain } = await loadFixture(deployFixture);
            await expect(traceChain.verifyProduct(999)).to.be.revertedWith("Product does not exist");
        });
    });

    describe("Invalid State Transitions", function () {
        it("should reject selling a manufactured product", async function () {
            const { traceChain, admin, manufacturer } = await loadFixture(registerProductFixture);
            await traceChain.connect(admin).addRetailer(manufacturer.address);
            await expect(
                traceChain.connect(manufacturer).sellProduct(PRODUCT_ID)
            ).to.be.revertedWith("Product must be in RETAILER_RECEIVED status");
        });

        it("should reject transferring a sold product", async function () {
            const { traceChain, retailer, distributor } = await loadFixture(soldProductFixture);
            await expect(
                traceChain.connect(retailer).transferProduct(PRODUCT_ID, distributor.address)
            ).to.be.revertedWith("Product not in transferable status");
        });

        it("should reject certifying a sold product", async function () {
            const { traceChain, certifier } = await loadFixture(soldProductFixture);
            await expect(
                traceChain.connect(certifier).certifyProduct(PRODUCT_ID)
            ).to.be.revertedWith("Product must be in MANUFACTURED status");
        });

        it("should reject receiving a product that is not in transit", async function () {
            const { traceChain, distributor } = await loadFixture(certifiedProductFixture);
            await expect(
                traceChain.connect(distributor).receiveProduct(PRODUCT_ID)
            ).to.be.revertedWith("Product is not in transit");
        });
    });

    describe("Return Flow - Request", function () {
        it("should allow return request on a sold returnable product", async function () {
            const { traceChain, customer } = await loadFixture(soldProductFixture);
            await expect(traceChain.connect(customer).requestReturn(PRODUCT_ID))
                .to.emit(traceChain, "ReturnRequested")
                .withArgs(PRODUCT_ID);
            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.RETURN_REQUESTED);
        });

        it("should reject return request on a non-returnable product", async function () {
            const { traceChain, manufacturer, certifier, distributor, retailer, customer } =
                await loadFixture(deployFixture);
            await traceChain.connect(manufacturer).registerProduct(
                PRODUCT_ID, PRODUCT_NAME, PRODUCT_CATEGORY, BATCH_ID,
                MFG_DATE, EXP_DATE, MFG_LOCATION, false, 0
            );
            await traceChain.connect(certifier).certifyProduct(PRODUCT_ID);
            await traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address);
            await traceChain.connect(distributor).receiveProduct(PRODUCT_ID);
            await traceChain.connect(distributor).transferProduct(PRODUCT_ID, retailer.address);
            await traceChain.connect(retailer).receiveProduct(PRODUCT_ID);
            await traceChain.connect(retailer).sellProduct(PRODUCT_ID);
            await expect(
                traceChain.connect(customer).requestReturn(PRODUCT_ID)
            ).to.be.revertedWith("Product is not eligible for return");
        });

        it("should reject return request on a product not yet sold", async function () {
            const { traceChain, customer } = await loadFixture(retailerReceivedFixture);
            await expect(
                traceChain.connect(customer).requestReturn(PRODUCT_ID)
            ).to.be.revertedWith("Product must be in SOLD status");
        });

        it("should reject return request for a non-existent product", async function () {
            const { traceChain, customer } = await loadFixture(deployFixture);
            await expect(
                traceChain.connect(customer).requestReturn(999)
            ).to.be.revertedWith("Product does not exist");
        });
    });

    describe("Return Flow - Accept and Reverse Chain", function () {
        it("should allow retailer to accept a return", async function () {
            const { traceChain, retailer, customer } = await loadFixture(soldProductFixture);
            await traceChain.connect(customer).requestReturn(PRODUCT_ID);

            await expect(traceChain.connect(retailer).acceptReturn(PRODUCT_ID))
                .to.emit(traceChain, "ReturnAccepted")
                .withArgs(PRODUCT_ID, retailer.address);

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.RETURNED_TO_RETAILER);
            expect(product.condition).to.equal(ProductCondition.RETURNED);
        });

        it("should reject accept return by non-retailer", async function () {
            const { traceChain, distributor, customer } = await loadFixture(soldProductFixture);
            await traceChain.connect(customer).requestReturn(PRODUCT_ID);
            await expect(
                traceChain.connect(distributor).acceptReturn(PRODUCT_ID)
            ).to.be.revertedWith("Not retailer");
        });

        it("should complete the full reverse supply chain", async function () {
            const { traceChain, manufacturer, distributor, retailer, customer } =
                await loadFixture(soldProductFixture);

            await traceChain.connect(customer).requestReturn(PRODUCT_ID);
            await traceChain.connect(retailer).acceptReturn(PRODUCT_ID);

            await traceChain.connect(retailer).transferReturn(PRODUCT_ID, distributor.address);
            let product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.RETURN_IN_TRANSIT);

            await traceChain.connect(distributor).receiveReturn(PRODUCT_ID);
            product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.DISTRIBUTOR_RETURN_RECEIVED);

            await traceChain.connect(distributor).transferReturn(PRODUCT_ID, manufacturer.address);
            product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.RETURN_IN_TRANSIT);

            await traceChain.connect(manufacturer).receiveReturn(PRODUCT_ID);
            product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.MANUFACTURER_RETURN_RECEIVED);
            expect(product.currentOwner).to.equal(manufacturer.address);
        });
    });

    describe("Inspection and Resolution", function () {
        async function manufacturerReturnReceivedFixture() {
            const fixture = await soldProductFixture();
            const { traceChain, manufacturer, distributor, retailer, customer } = fixture;
            await traceChain.connect(customer).requestReturn(PRODUCT_ID);
            await traceChain.connect(retailer).acceptReturn(PRODUCT_ID);
            await traceChain.connect(retailer).transferReturn(PRODUCT_ID, distributor.address);
            await traceChain.connect(distributor).receiveReturn(PRODUCT_ID);
            await traceChain.connect(distributor).transferReturn(PRODUCT_ID, manufacturer.address);
            await traceChain.connect(manufacturer).receiveReturn(PRODUCT_ID);
            return fixture;
        }

        it("should allow manufacturer to inspect and restock", async function () {
            const { traceChain, manufacturer } = await loadFixture(manufacturerReturnReceivedFixture);

            await expect(traceChain.connect(manufacturer).inspectAndResolve(PRODUCT_ID, "RESTOCKED"))
                .to.emit(traceChain, "ProductInspected")
                .to.emit(traceChain, "ProductRestocked");

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.RESTOCKED);
            expect(product.condition).to.equal(ProductCondition.NEW);
        });

        it("should allow manufacturer to inspect and refurbish", async function () {
            const { traceChain, manufacturer } = await loadFixture(manufacturerReturnReceivedFixture);

            await expect(traceChain.connect(manufacturer).inspectAndResolve(PRODUCT_ID, "REFURBISHED"))
                .to.emit(traceChain, "ProductRefurbished");

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.REFURBISHED);
            expect(product.condition).to.equal(ProductCondition.REFURBISHED);
        });

        it("should allow manufacturer to inspect and mark damaged", async function () {
            const { traceChain, manufacturer } = await loadFixture(manufacturerReturnReceivedFixture);

            await expect(traceChain.connect(manufacturer).inspectAndResolve(PRODUCT_ID, "DAMAGED"))
                .to.emit(traceChain, "ProductDamaged");

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.DAMAGED);
            expect(product.condition).to.equal(ProductCondition.DAMAGED);
        });

        it("should allow manufacturer to inspect and dispose", async function () {
            const { traceChain, manufacturer } = await loadFixture(manufacturerReturnReceivedFixture);

            await expect(traceChain.connect(manufacturer).inspectAndResolve(PRODUCT_ID, "DISPOSED"))
                .to.emit(traceChain, "ProductDisposed");

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.DISPOSED);
            expect(product.condition).to.equal(ProductCondition.DISPOSED);
        });

        it("should reject inspection by non-manufacturer", async function () {
            const { traceChain, distributor } = await loadFixture(manufacturerReturnReceivedFixture);
            await expect(
                traceChain.connect(distributor).inspectAndResolve(PRODUCT_ID, "REFURBISHED")
            ).to.be.revertedWith("Not manufacturer");
        });

        it("should reject inspection of product not in MANUFACTURER_RETURN_RECEIVED status", async function () {
            const { traceChain, manufacturer } = await loadFixture(registerProductFixture);
            await expect(
                traceChain.connect(manufacturer).inspectAndResolve(PRODUCT_ID, "REFURBISHED")
            ).to.be.revertedWith("Product must be in MANUFACTURER_RETURN_RECEIVED status");
        });

        it("should reject invalid inspection outcome", async function () {
            const { traceChain, manufacturer } = await loadFixture(manufacturerReturnReceivedFixture);
            await expect(
                traceChain.connect(manufacturer).inspectAndResolve(PRODUCT_ID, "INVALID")
            ).to.be.revertedWith("Invalid inspection outcome");
        });

        it("should preserve complete history after inspection", async function () {
            const { traceChain, manufacturer } = await loadFixture(manufacturerReturnReceivedFixture);
            await traceChain.connect(manufacturer).inspectAndResolve(PRODUCT_ID, "REFURBISHED");
            const history = await traceChain.getHistory(PRODUCT_ID);
            expect(history.length).to.be.greaterThan(10);
            expect(history[0].action).to.equal("PRODUCT_CREATED");
            const lastEntry = history[history.length - 1];
            expect(lastEntry.action).to.equal("REFURBISHED");
        });
    });

    describe("Refurbished Product Re-entry", function () {
        it("should allow a refurbished product to re-enter the forward supply chain", async function () {
            const { traceChain, manufacturer, certifier, distributor, retailer, customer } =
                await loadFixture(soldProductFixture);

            await traceChain.connect(customer).requestReturn(PRODUCT_ID);
            await traceChain.connect(retailer).acceptReturn(PRODUCT_ID);
            await traceChain.connect(retailer).transferReturn(PRODUCT_ID, distributor.address);
            await traceChain.connect(distributor).receiveReturn(PRODUCT_ID);
            await traceChain.connect(distributor).transferReturn(PRODUCT_ID, manufacturer.address);
            await traceChain.connect(manufacturer).receiveReturn(PRODUCT_ID);
            await traceChain.connect(manufacturer).inspectAndResolve(PRODUCT_ID, "REFURBISHED");

            await traceChain.connect(manufacturer).transferProduct(PRODUCT_ID, distributor.address);
            await traceChain.connect(distributor).receiveProduct(PRODUCT_ID);
            await traceChain.connect(distributor).transferProduct(PRODUCT_ID, retailer.address);
            await traceChain.connect(retailer).receiveProduct(PRODUCT_ID);
            await traceChain.connect(retailer).sellProduct(PRODUCT_ID);

            const product = await traceChain.getProduct(PRODUCT_ID);
            expect(product.status).to.equal(ProductStatus.SOLD);
            expect(product.condition).to.equal(ProductCondition.REFURBISHED);

            const history = await traceChain.getHistory(PRODUCT_ID);
            expect(history.length).to.be.greaterThan(15);
            expect(history[0].action).to.equal("PRODUCT_CREATED");
        });
    });

    describe("History Immutability", function () {
        it("should only grow the history array and never shrink it", async function () {
            const { traceChain, certifier } = await loadFixture(registerProductFixture);
            let history = await traceChain.getHistory(PRODUCT_ID);
            expect(history.length).to.equal(1);

            await traceChain.connect(certifier).certifyProduct(PRODUCT_ID);
            history = await traceChain.getHistory(PRODUCT_ID);
            expect(history.length).to.equal(2);
        });

        it("should include all timestamps in chronological order", async function () {
            const { traceChain } = await loadFixture(soldProductFixture);
            const history = await traceChain.getHistory(PRODUCT_ID);
            for (let i = 1; i < history.length; i++) {
                expect(history[i].timestamp).to.be.greaterThanOrEqual(history[i - 1].timestamp);
            }
        });
    });
});