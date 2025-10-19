import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();
  const { instance } = useZamaInstance();
  const [activeGameId, setActiveGameId] = useState<bigint | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [games, setGames] = useState<Array<{
    id: bigint;
    player1: string;
    player2: string;
    publicCards: number[];
    hasSel1: boolean;
    hasSel2: boolean;
    status: number;
    winner: string;
    claimed: boolean;
  }>>([]);
  const [gamesLoading, setGamesLoading] = useState<boolean>(false);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  const statusLabels = useMemo(
    () => ['Waiting for Player', 'Waiting Selections', 'Opened', 'Finished'],
    [],
  );

  const formatAddress = useCallback((value?: string) => {
    if (!value || value === ethers.ZeroAddress) return '—';
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  }, []);

  const { data: nextGameId, refetch: refetchNextGame } = useReadContract({
    abi: CONTRACT_ABI as any,
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'nextGameId',
    query: { refetchOnWindowFocus: false },
  });

  const { data: gameData, refetch: refetchGame } = useReadContract({
    abi: CONTRACT_ABI as any,
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'getGame',
    args: activeGameId ? [activeGameId] : undefined,
    query: { enabled: !!activeGameId },
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
    const receipt = await tx.wait();

    let createdId: bigint | null = null;
    for (const log of receipt?.logs ?? []) {
      if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
      try {
        const parsed = contract.interface.parseLog(log);
        if (!parsed) continue;
        if (parsed.name === 'GameCreated') {
          createdId = parsed.args.gameId as bigint;
          break;
        }
      } catch (err) {
        continue;
      }
    }

    if (createdId && createdId > 0n) {
      setActiveGameId(createdId);
    } else {
      const latest = await refetchNextGame();
      const data = latest.data as bigint | undefined;
      if (data && data > 0n) {
        setActiveGameId(data - 1n);
      }
    }

    setRefreshCounter((value) => value + 1);
  };

  const joinGame = async (gid: bigint) => {
    const signer = await signerPromise!;
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI as any, signer);
    const tx = await contract.joinGame(gid, { value: 1000000000000000n });
    await tx.wait();
    setActiveGameId(gid);
    await refetchGame();
    setRefreshCounter((value) => value + 1);
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
    setRefreshCounter((value) => value + 1);
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
      setRefreshCounter((value) => value + 1);
    } catch (e) {
      console.error('claim failed', e);
    }
  };

  const loadGames = useCallback(async () => {
    if (!publicClient || !nextGameId) {
      setGames([]);
      return;
    }

    const total = Number(nextGameId);
    if (total <= 1) {
      setGames([]);
      return;
    }

    const ids = Array.from({ length: total - 1 }, (_, index) => BigInt(index + 1));
    setGamesLoading(true);
    try {
      const response = await publicClient.multicall({
        allowFailure: true,
        contracts: ids.map((id) => ({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI as any,
          functionName: 'getGame',
          args: [id],
        })),
      });

      const formatted = response
        .map((entry, index) => {
          if (entry.status !== 'success') return null;
          const [player1, player2, publicCards, hasSel1, hasSel2, status, winner, claimed] = entry.result as any[];
          if (!player1 || player1 === ethers.ZeroAddress) return null;
          return {
            id: ids[index],
            player1,
            player2,
            publicCards: (publicCards as Array<number | bigint>).map((card) => Number(card)),
            hasSel1,
            hasSel2,
            status: Number(status),
            winner,
            claimed,
          };
        })
        .filter(Boolean) as Array<{
          id: bigint;
          player1: string;
          player2: string;
          publicCards: number[];
          hasSel1: boolean;
          hasSel2: boolean;
          status: number;
          winner: string;
          claimed: boolean;
        }>;

      setGames(formatted.sort((a, b) => Number(b.id - a.id)));
    } catch (error) {
      console.error('Failed to load games', error);
    } finally {
      setGamesLoading(false);
    }
  }, [publicClient, nextGameId]);

  useEffect(() => {
    void loadGames();
  }, [loadGames, refreshCounter]);

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

          <div style={{ marginTop: 8 }}>
            <h3 style={{ marginBottom: 12 }}>Games</h3>
            {gamesLoading ? (
              <div>Loading games…</div>
            ) : games.length === 0 ? (
              <div>No games yet. Create the first one!</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {games.map((game) => {
                  const isActive = activeGameId === game.id;
                  const canJoin =
                    game.status === 0 &&
                    game.player1 !== ethers.ZeroAddress &&
                    game.player2 === ethers.ZeroAddress &&
                    (!address || address.toLowerCase() !== game.player1.toLowerCase());

                  return (
                    <div
                      key={String(game.id)}
                      style={{
                        padding: 16,
                        borderRadius: 8,
                        border: isActive ? '2px solid #6366f1' : '1px solid #e5e7eb',
                        background: '#fff',
                        display: 'grid',
                        gap: 8,
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>Game #{String(game.id)}</div>
                        <div>Status: {statusLabels[game.status] ?? 'Unknown'}</div>
                      </div>
                      <div>Players: {formatAddress(game.player1)} vs {formatAddress(game.player2)}</div>
                      <div>Public Cards: {game.publicCards.join(', ')}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setActiveGameId(game.id)}
                          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
                          View Details
                        </button>
                        {canJoin && (
                          <button
                            onClick={() => joinGame(game.id)}
                            style={{ padding: '8px 12px', borderRadius: 6, background: '#111', color: '#fff' }}>
                            Join (0.001 ETH)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {activeGameId && renderBoard()}
        </div>
      ) : (
        <div>Please connect wallet on Sepolia to play.</div>
      )}

      <div style={{ marginTop: 32, padding: 16, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>How to Play</h3>
        <ol style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 8 }}>
          <li>Create a new game or join an open game. Each action requires a 0.001 ETH stake.</li>
          <li>Once two players are seated, the contract reveals five public cards numbered 1 through 13.</li>
          <li>Each player privately selects one of the public cards. Selections are encrypted with Zama FHE and can overlap.</li>
          <li>The final player to submit triggers reveal. Both encrypted choices are decrypted on-chain.</li>
          <li>If both players chose the same card, the pot is burned and nobody wins. Otherwise, the higher card wins the 0.002 ETH pot.</li>
          <li>The winner uses the claim button to withdraw the reward after the reveal.</li>
        </ol>
      </div>
    </div>
  );
}
