import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database.js";
import { getProvider, RPC_URL } from "./config/blockchain.js";
import productRoutes from "./routes/productRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", async (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "TraceChain Backend",
  });
});

app.get("/api/blockchain/status", async (_req: Request, res: Response) => {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    res.json({
      status: "connected",
      rpcUrl: RPC_URL,
      chainId: Number(network.chainId),
      networkName: network.name,
      currentBlock: blockNumber,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(503).json({
      status: "disconnected",
      error: message,
    });
  }
});

app.use("/api/products", productRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const start = async (): Promise<void> => {
  try {
    await connectDB();
    console.log("MongoDB connection established");
  } catch (err) {
    console.warn("MongoDB not available — starting without database:", (err as Error).message);
  }

  app.listen(PORT, () => {
    console.log(`TraceChain backend running on http://localhost:${PORT}`);
  });
};

start();

export default app;