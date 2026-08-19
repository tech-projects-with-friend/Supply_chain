"use client";

import { useState, useEffect } from "react";

const STATUS_MAP = [
  "MANUFACTURED", "CERTIFIED", "IN_TRANSIT", "DISTRIBUTOR_RECEIVED",
  "RETAILER_RECEIVED", "SOLD", "RETURN_REQUESTED", "RETURNED_TO_RETAILER",
  "RETURN_IN_TRANSIT", "DISTRIBUTOR_RETURN_RECEIVED", "MANUFACTURER_RETURN_RECEIVED",
  "INSPECTED", "RESTOCKED", "REFURBISHED", "DAMAGED", "DISPOSED"
];

export default function Home() {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/products/1")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white text-xl">Loading TraceChain data...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-black text-red-500 text-xl">Error: {error}</div>;

  const details = product?.onChain?.details || [];
  const history = product?.onChain?.history || [];

  return (
    <main className="min-h-screen p-8 bg-black text-white font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-blue-500 tracking-tight">TraceChain Explorer</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 border-b border-zinc-700 pb-3">Product Info</h2>
            <div className="space-y-3 text-sm">
              <p><span className="text-zinc-400">ID:</span> {details[0]}</p>
              <p><span className="text-zinc-400">Name:</span> <span className="font-bold text-white text-base">{details[1]}</span></p>
              <p><span className="text-zinc-400">Category:</span> {details[2]}</p>
              <p><span className="text-zinc-400">Batch:</span> {details[3]}</p>
              <p><span className="text-zinc-400">Location:</span> {details[15]}</p>
              <p className="flex items-center mt-2">
                <span className="text-zinc-400 mr-3">Status:</span>
                <span className="bg-blue-900 text-blue-300 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
                  {STATUS_MAP[details[8]] || "UNKNOWN"}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 border-b border-zinc-700 pb-3">Ownership & Dates</h2>
            <div className="space-y-3 text-sm">
              <p className="truncate"><span className="text-zinc-400">Manufacturer:</span> <br />{details[4]}</p>
              <p className="truncate"><span className="text-zinc-400">Current Owner:</span> <br />{details[6]}</p>
              <p><span className="text-zinc-400">Mfg Date:</span> {new Date(Number(details[13]) * 1000).toLocaleDateString()}</p>
              <p><span className="text-zinc-400">Expiry Date:</span> {new Date(Number(details[14]) * 1000).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 border-b border-zinc-700 pb-3">Lifecycle History</h2>
          <div className="space-y-4">
            {history.map((event: any, index: number) => (
              <div key={index} className="p-4 bg-black border border-zinc-800 rounded-lg text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <p className="font-bold text-green-400 mb-1">{event[1]}</p>
                  <p className="truncate w-48 sm:w-auto"><span className="text-zinc-500">Actor:</span> {event[0]}</p>
                </div>
                <div className="mt-2 sm:mt-0 text-zinc-400 text-right">
                  {new Date(Number(event[4]) * 1000).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}