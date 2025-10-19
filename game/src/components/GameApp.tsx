import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { useState } from 'react';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { ethers } from 'ethers';

function toDigest(gameId: bigint, choice: number) {
  const abi = new ethers.AbiCoder();
  const encoded = abi.encode(["uint256","uint8"], [gameId, choice]);
  return ethers.keccak256(encoded);
}

export function GameApp() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance } = useZamaInstance();
  const [gameIdInput, setGameIdInput] = useState<string>('');
  const [activeGameId, setActiveGameId] = useState<bigint | null>(null);
  const [picking, setPicking] = useState<number | null>(null);

  const { data: nextGameId } = useReadContract({
    abi: CONTRACT_ABI as any,
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'nextGameId',
  });

  const { data: gameData, refetch: refetchGame } = useReadContract({
    abi: CONTRACT_ABI as any,
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'getGame',
    args: activeGameId ? [activeGameId] : undefined,
  });

  const { data: selections } = useReadContract({
    abi: CONTRACT_ABI as any,
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'getSelections',
    args: activeGameId ? [activeGameId] : undefined,
    query: { enabled: !!activeGameId },
  });

  const createGame = async () => {
    const signer = await signerPromise!;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, signer);
    const tx = await contract.createGame({ value: 1000000000000000n });
    await tx.wait();
  };

  const joinGame = async (gid: bigint) => {
    const signer = await signerPromise!;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, signer);
    const tx = await contract.joinGame(gid, { value: 1000000000000000n });
    await tx.wait();
    setActiveGameId(gid);
    await refetchGame();
  };

  const submitSelection = async (choice: number) => {
    if (!instance || !address || !activeGameId) return;
    setPicking(choice);
    const signer = await signerPromise!;
    const buf = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
    buf.add8(BigInt(choice));
    const encrypted = await buf.encrypt();
    const digest = toDigest(activeGameId, choice);
    const sig = await signer.signMessage(ethers.getBytes(digest));
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, signer);
    const tx = await contract.submitSelection(activeGameId, encrypted.handles[0], encrypted.inputProof, sig);
    await tx.wait();
    setPicking(null);
    await refetchGame();
  };

  const claim = async () => {
    if (!activeGameId || !selections) return;
    // Attempt user decryption for both selections
    try {
      const signer = await signerPromise!;
      const selArr = selections as any[];
      const handleContractPairs = [
        { handle: selArr[0] as string, contractAddress: CONTRACT_ADDRESS },
        { handle: selArr[1] as string, contractAddress: CONTRACT_ADDRESS },
      ];

      const keypair = instance.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '1';
      const eip712 = instance.createEIP712(keypair.publicKey, [CONTRACT_ADDRESS], startTimeStamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.publicKey,
        startTimeStamp,
        durationDays,
        signature,
      );

      const [p1, p2] = result.values.map((v: any) => Number(v));
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, signer);
      const tx = await contract.claim(activeGameId, p1, p2);
      await tx.wait();
      await refetchGame();
    } catch (e) {
      console.error('claim failed', e);
    }
  };

  const renderBoard = () => {
    if (!gameData) return null;
    const [p1, p2, cards, hasSel1, hasSel2, status, winner] = gameData as any[];

    return (
      <div style={{ maxWidth: 800, margin: '24px auto', padding: 16, background: '#fff', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>Game #{String(activeGameId)}</div>
          <div>Status: {['WaitingForPlayer','WaitingSelections','Opened','Finished'][Number(status)]}</div>
        </div>
        <div style={{ marginBottom: 12 }}>Players: {p1} vs {p2}</div>
        <div style={{ marginBottom: 12 }}>Public Cards: {cards.join(', ')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cards.map((c: number) => (
            <button key={c}
              disabled={Boolean(picking) || Boolean(hasSel1 && address === p1) || Boolean(hasSel2 && address === p2) || Number(status) !== 1}
              onClick={() => submitSelection(c)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}>
              Pick {c}
            </button>
          ))}
        </div>
        {Number(status) === 2 && (
          <div style={{ marginTop: 16 }}>
            <button onClick={claim} style={{ padding: '10px 16px', borderRadius: 6, background: '#111', color: '#fff' }}>
              Reveal & Claim 0.002 ETH
            </button>
          </div>
        )}
        {Number(status) === 3 && (
          <div style={{ marginTop: 16 }}>Winner: {winner || 'None (tie)'}</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Five Card Draw</h2>
        <ConnectButton />
      </div>

      {isConnected ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={createGame}
              style={{ padding: '10px 16px', borderRadius: 6, background: '#111', color: '#fff' }}>
              Create Game (0.001 ETH)
            </button>
            <div>Next Game ID: {String(nextGameId || '')}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input placeholder="Game ID" value={gameIdInput} onChange={(e) => setGameIdInput(e.target.value)}
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
            <button onClick={() => setActiveGameId(BigInt(gameIdInput))}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>Load</button>
            <button onClick={() => joinGame(BigInt(gameIdInput))}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>Join (0.001 ETH)</button>
          </div>

          {activeGameId && renderBoard()}
        </div>
      ) : (
        <div>Please connect wallet on Sepolia to play.</div>
      )}
    </div>
  );
}
