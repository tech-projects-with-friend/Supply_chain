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

// 2. REGISTER ROUTE: Matches your smart contract's 9 exact arguments
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      productId, name, category, batchId,
      manufacturingDate, expiryDate, manufacturingLocation,
      returnEligible, returnPeriod,
      description, imageUrl, additionalNotes
    } = req.body;

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
        { productId },
        { description, imageUrl, additionalNotes },
        { upsert: true, new: true }
      );
    } catch (dbError) {
      console.warn("MongoDB save failed (DB likely offline). Blockchain transaction succeeded.");
    }

    res.status(201).json({ success: true, txHash: tx.hash });
  } catch (error: any) {
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

export default router;