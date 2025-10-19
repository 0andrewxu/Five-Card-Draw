import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { ethers } from 'ethers';
import styles from './GameApp.module.css';

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
    const statusNum = Number(status);

    return (
      <div className={styles.gameBoard}>
        <div className={styles.gameBoardHeader}>
          <h2 className={styles.gameBoardTitle}>Game #{String(activeGameId)}</h2>
          <div className={`${styles.statusBadge} ${
            statusNum === 0 ? styles.statusWaiting :
            statusNum === 1 ? styles.statusActive :
            statusNum === 2 ? styles.statusOpened :
            styles.statusFinished
          }`}>
            {statusLabels[statusNum]}
          </div>
        </div>

        <div className={styles.playersSection}>
          <div className={`${styles.playerCard} ${address?.toLowerCase() === p1.toLowerCase() ? styles.playerCardActive : ''}`}>
            <div className={styles.playerLabel}>Player 1</div>
            <div className={styles.playerAddress}>{formatAddress(p1)}</div>
            <div className={`${styles.selectionStatus} ${hasSel1 ? styles.selectionSubmitted : styles.selectionPending}`}>
              {hasSel1 ? '✓ Submitted' : '⏳ Pending'}
            </div>
          </div>
          <div className={`${styles.playerCard} ${address?.toLowerCase() === p2.toLowerCase() ? styles.playerCardActive : ''}`}>
            <div className={styles.playerLabel}>Player 2</div>
            <div className={styles.playerAddress}>{formatAddress(p2)}</div>
            <div className={`${styles.selectionStatus} ${hasSel2 ? styles.selectionSubmitted : styles.selectionPending}`}>
              {hasSel2 ? '✓ Submitted' : '⏳ Pending'}
            </div>
          </div>
        </div>

        <div className={styles.publicCardsSection}>
          <div className={styles.sectionLabel}>Public Cards - Choose One</div>
          <div className={styles.publicCards}>
            {cards.map((c: number) => (
              <button
                key={c}
                disabled={Boolean(picking) || Boolean(hasSel1 && address === p1) || Boolean(hasSel2 && address === p2) || statusNum !== 1}
                onClick={() => submitSelection(c)}
                className={styles.publicCard}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {statusNum === 2 && (
          <div className={styles.claimSection}>
            <button onClick={claim} className={styles.buttonDanger}>
              🎯 Reveal & Claim 0.002 ETH
            </button>
          </div>
        )}

        {statusNum === 3 && (
          <div className={styles.winnerSection}>
            <p className={styles.winnerText}>
              {winner && winner !== ethers.ZeroAddress ? '🏆 Winner' : '🤝 Tie - No Winner'}
            </p>
            {winner && winner !== ethers.ZeroAddress && (
              <div className={styles.winnerAddress}>{formatAddress(winner)}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🎴 Five Card Draw</h1>
          <div className={styles.subtitle}>Privacy-Preserving Blockchain Card Game</div>
        </div>
        <ConnectButton />
      </div>

      {isConnected ? (
        <>
          <div className={styles.mainContent}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Create New Game</h3>
                <div className={styles.infoBadge}>
                  Next ID: {String(nextGameId || '—')}
                </div>
              </div>
              <button onClick={createGame} className={styles.buttonPrimary}>
                🎮 Create Game (0.001 ETH)
              </button>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Available Games</h3>
              </div>
              {gamesLoading ? (
                <div className={styles.loading}>Loading games...</div>
              ) : games.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>🎯</div>
                  <div className={styles.emptyStateText}>No games yet. Create the first one!</div>
                </div>
              ) : (
                <div className={styles.gamesList}>
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
                        className={`${styles.gameItem} ${isActive ? styles.gameItemActive : ''}`}
                        onClick={() => setActiveGameId(game.id)}>
                        <div className={styles.gameHeader}>
                          <div className={styles.gameId}>Game #{String(game.id)}</div>
                          <div className={`${styles.statusBadge} ${
                            game.status === 0 ? styles.statusWaiting :
                            game.status === 1 ? styles.statusActive :
                            game.status === 2 ? styles.statusOpened :
                            styles.statusFinished
                          }`}>
                            {statusLabels[game.status] ?? 'Unknown'}
                          </div>
                        </div>
                        <div className={styles.playersInfo}>
                          Players: <span className={styles.address}>{formatAddress(game.player1)}</span> vs{' '}
                          <span className={styles.address}>{formatAddress(game.player2)}</span>
                        </div>
                        <div className={styles.cardsRow}>
                          {game.publicCards.map((card) => (
                            <div key={card} className={styles.cardChip}>
                              {card}
                            </div>
                          ))}
                        </div>
                        <div className={styles.gameActions}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveGameId(game.id);
                            }}
                            className={styles.buttonSecondary}>
                            View Details
                          </button>
                          {canJoin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                joinGame(game.id);
                              }}
                              className={styles.buttonPrimary}>
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
          </div>

          {activeGameId && renderBoard()}

          <div className={styles.howToPlay}>
            <h3 className={styles.howToPlayTitle}>📖 How to Play</h3>
            <ol className={styles.howToPlayList}>
              <li>Create a new game or join an open game. Each action requires a 0.001 ETH stake.</li>
              <li>Once two players are seated, the contract reveals five public cards numbered 1 through 13.</li>
              <li>Each player privately selects one of the public cards. Selections are encrypted with Zama FHE and can overlap.</li>
              <li>The final player to submit triggers reveal. Both encrypted choices are decrypted on-chain.</li>
              <li>If both players chose the same card, the pot is burned and nobody wins. Otherwise, the higher card wins the 0.002 ETH pot.</li>
              <li>The winner uses the claim button to withdraw the reward after the reveal.</li>
            </ol>
          </div>
        </>
      ) : (
        <div className={styles.connectWallet}>
          <div className={styles.emptyStateIcon}>🔐</div>
          <div className={styles.connectWalletText}>Please connect your wallet on Sepolia to play</div>
          <div style={{ marginTop: 16 }}>
            <ConnectButton />
          </div>
        </div>
      )}
    </div>
  );
}
