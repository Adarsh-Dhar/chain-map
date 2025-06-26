import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface TestContractsProps {
  receiverAbi: any[];
  senderAbi: any[];
  receiverAddress: string;
  senderAddress: string;
}

function getFunctions(abi: any[]) {
  return abi.filter((item) => item.type === 'function');
}

const ContractFunctionForm: React.FC<{
  contractName: string;
  address: string;
  abi: any[];
  func: any;
  provider: ethers.providers.Web3Provider | null;
}> = ({ contractName, address, abi, func, provider }) => {
  const [inputs, setInputs] = useState<any[]>(func.inputs.map(() => ''));
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (idx: number, value: string) => {
    setInputs((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };

  const handleCall = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (!provider) throw new Error('No provider');
      const signer = provider.getSigner();
      const contract = new ethers.Contract(address, abi, signer);
      const args = inputs.map((v, i) => {
        // Try to parse numbers, otherwise keep as string
        const type = func.inputs[i]?.type;
        if (type && type.startsWith('uint')) return ethers.BigNumber.from(v);
        return v;
      });
      let res;
      if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
        res = await contract[func.name](...args);
      } else {
        const tx = await contract[func.name](...args);
        res = await tx.wait();
      }
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white shadow">
      <div className="font-semibold mb-2">{contractName}: {func.name}</div>
      <form
        className="flex flex-col gap-2"
        onSubmit={e => {
          e.preventDefault();
          handleCall();
        }}
      >
        {func.inputs.map((input: any, idx: number) => (
          <input
            key={idx}
            className="input input-bordered px-2 py-1 rounded border border-gray-300"
            placeholder={`${input.name || 'arg' + idx} (${input.type})`}
            value={inputs[idx]}
            onChange={e => handleChange(idx, e.target.value)}
            required
          />
        ))}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Calling...' : func.stateMutability === 'view' || func.stateMutability === 'pure' ? 'Call' : 'Send'}
        </button>
      </form>
      {result && (
        <div className="mt-2 text-green-700 break-all">
          <strong>Result:</strong> {JSON.stringify(result)}
        </div>
      )}
      {error && (
        <div className="mt-2 text-red-600 break-all">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export const TestContracts: React.FC<TestContractsProps> = ({ receiverAbi, senderAbi, receiverAddress, senderAddress }) => {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);

  useEffect(() => {
    if ((window as any).ethereum) {
      setProvider(new ethers.providers.Web3Provider((window as any).ethereum));
    }
  }, []);

  const receiverFunctions = getFunctions(receiverAbi);
  const senderFunctions = getFunctions(senderAbi);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-center">Contract Function Tester</h1>
      <div className="mb-8">
        <div className="font-semibold">Receiver Address:</div>
        <div className="mb-2 text-sm text-gray-700">{receiverAddress}</div>
        {receiverFunctions.map((func, idx) => (
          <ContractFunctionForm
            key={func.name + idx}
            contractName="Receiver"
            address={receiverAddress}
            abi={receiverAbi}
            func={func}
            provider={provider}
          />
        ))}
      </div>
      <div>
        <div className="font-semibold">Sender Address:</div>
        <div className="mb-2 text-sm text-gray-700">{senderAddress}</div>
        {senderFunctions.map((func, idx) => (
          <ContractFunctionForm
            key={func.name + idx}
            contractName="Sender"
            address={senderAddress}
            abi={senderAbi}
            func={func}
            provider={provider}
          />
        ))}
      </div>
      {!provider && (
        <div className="mt-6 text-center text-yellow-700">
          Please install and connect MetaMask or another Ethereum wallet.
        </div>
      )}
    </div>
  );
};

export default TestContracts; 