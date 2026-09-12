import { Router, Request, Response } from 'express';
import { getContractWrite, getContractRead } from '../config/blockchain.js';
import { ProductMeta } from '../models/ProductMeta.js';

const router = Router();

// 1. SETUP ROUTE: Grants the Manufacturer role to your backend wallet
router.post('/setup', async (req: Request, res: Response) => {
    try {
        const contract = getContractWrite();
        if (!contract) return res.status(503).json({ error: 'Blockchain write connection not available' });

        const walletAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Your default Hardhat Account #0
        const tx = await contract.addManufacturer(walletAddress);
        await tx.wait();

        res.status(200).json({ success: true, message: "Manufacturer role successfully granted!" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2. REGISTER ROUTE: Handles both client MetaMask on-chain registration (via txHash) and backend relayer fallback
router.post('/register', async (req: Request, res: Response) => {
    try {
        const {
            productId, name, category, batchId,
            manufacturingDate, expiryDate, manufacturingLocation,
            returnEligible, returnPeriod,
            description, imageUrl, additionalNotes,
            txHash
        } = req.body;

        // ─────────────────────────────────────────────────────────────
        // 1. Client MetaMask Flow: txHash exists -> Skip ethers.js
        // ─────────────────────────────────────────────────────────────
        if (txHash) {
            console.log(`[Register] On-chain txHash received (${txHash}) for product #${productId}. Skipping smart contract call; saving metadata to MongoDB.`);

            // Directly save off-chain metadata + txHash to MongoDB
            try {
                await ProductMeta.findOneAndUpdate(
                    { productId: String(productId) },
                    { description, imageUrl, additionalNotes, txHash },
                    { upsert: true, new: true }
                );
                console.log(`[Register] Product #${productId} metadata successfully synced to MongoDB.`);
            } catch (dbError: any) {
                console.warn("[Register] MongoDB save warning (database may be unreachable):", dbError.message);
            }

            return res.status(201).json({
                success: true,
                message: "Product metadata successfully saved to MongoDB",
                txHash
            });
        }

        // ─────────────────────────────────────────────────────────────
        // 2. Fallback Flow: No txHash -> Backend executes on-chain tx
        // ─────────────────────────────────────────────────────────────
        console.log(`[Register] No txHash provided. Executing on-chain registration via backend wallet for product #${productId}...`);
        const contract = getContractWrite();
        if (!contract) return res.status(503).json({ error: 'Blockchain write connection not available' });

        const tx = await contract.registerProduct(
            productId, name, category, batchId,
            manufacturingDate, expiryDate, manufacturingLocation,
            returnEligible, returnPeriod
        );
        await tx.wait();

        // Safely try MongoDB, but don't fail if it is offline
        try {
            await ProductMeta.findOneAndUpdate(
                { productId: String(productId) },
                { description, imageUrl, additionalNotes, txHash: tx.hash },
                { upsert: true, new: true }
            );
        } catch (dbError: any) {
            console.warn("[Register] MongoDB save warning:", dbError.message);
        }

        return res.status(201).json({ success: true, txHash: tx.hash });
    } catch (error: any) {
        console.error("[Register] Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 3. GET ROUTE: Fetches data and safely converts BigInts to Strings for the browser
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const productId = req.params.id;
        const contract = getContractRead();
        if (!contract) return res.status(503).json({ error: 'Blockchain read connection not available' });

        const productDetails = await contract.getProduct(productId);
        const history = await contract.getHistory(productId);

        let meta = null;
        try {
            meta = await ProductMeta.findOne({ productId });
        } catch (dbError) {
            // Ignore DB errors if offline
        }

        // Prevents "Do not know how to serialize a BigInt" crash
        const serializeBigInt = (obj: any): any =>
            JSON.parse(JSON.stringify(obj, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ));

        res.status(200).json({
            onChain: {
                details: serializeBigInt(productDetails),
                history: serializeBigInt(history)
            },
            offChain: meta || {}
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
// 4. CERTIFY ROUTE: Certifier approves the product (Status -> CERTIFIED)
router.post('/:id/certify', async (req: Request, res: Response) => {
    try {
        const contract = getContractWrite();
        if (!contract) return res.status(503).json({ error: 'Blockchain write connection not available' });

        const tx = await contract.certifyProduct(req.params.id);
        await tx.wait();

        res.status(200).json({ success: true, txHash: tx.hash, message: "Product certified successfully!" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 5. TRANSFER ROUTE: Current owner sends product to a receiver (Status -> IN_TRANSIT)
router.post('/:id/transfer', async (req: Request, res: Response) => {
    try {
        const { receiverAddress } = req.body;
        const contract = getContractWrite();
        if (!contract) return res.status(503).json({ error: 'Blockchain write connection not available' });

        const tx = await contract.transferProduct(req.params.id, receiverAddress);
        await tx.wait();

        res.status(200).json({ success: true, txHash: tx.hash, message: "Product transferred successfully!" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 6. RECEIVE ROUTE: Expected receiver confirms possession (Status -> DISTRIBUTOR_RECEIVED / RETAILER_RECEIVED)
router.post('/:id/receive', async (req: Request, res: Response) => {
    try {
        const contract = getContractWrite();
        if (!contract) return res.status(503).json({ error: 'Blockchain write connection not available' });

        const tx = await contract.receiveProduct(req.params.id);
        await tx.wait();

        res.status(200).json({ success: true, txHash: tx.hash, message: "Product received successfully!" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 7. SELL ROUTE: Retailer marks the product as sold to a customer (Status -> SOLD)
router.post('/:id/sell', async (req: Request, res: Response) => {
    try {
        const contract = getContractWrite();
        if (!contract) return res.status(503).json({ error: 'Blockchain write connection not available' });

        const tx = await contract.sellProduct(req.params.id);
        await tx.wait();

        res.status(200).json({ success: true, txHash: tx.hash, message: "Product sold successfully!" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;