import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TraceChainModule = buildModule("TraceChainModule", (m) => {
  const traceChain = m.contract("TraceChain");
  return { traceChain };
});

export default TraceChainModule;
