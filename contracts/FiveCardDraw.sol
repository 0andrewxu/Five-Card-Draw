// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title Two-player Five Card Draw (single suit) with FHE selections
/// @notice Players deposit 0.001 ether each. Contract draws 5 public cards [1..13].
/// Each player submits an encrypted selection. When both selections are in, anyone can
/// trigger open (no branching on ciphertext). Winner can claim 0.002 ether by revealing
/// both plaintext choices with signatures from both players for verification.
/// If choices are equal, both lose and funds remain locked in the contract.
contract FiveCardDraw is ZamaEthereumConfig {
    using ECDSA for bytes32;

    uint256 public constant STAKE = 1e15; // 0.001 ether

    enum GameStatus {
        WaitingForPlayer, // only creator joined
        WaitingSelections, // both joined
        Opened, // both selections submitted
        Finished // claimed
    }

    struct Game {
        address player1;
        address player2;
        uint8[5] publicCards;
        euint8 sel1;
        euint8 sel2;
        bool hasSel1;
        bool hasSel2;
        bytes sig1; // EIP-191 signature over (gameId, choice)
        bytes sig2;
        GameStatus status;
        address winner; // set after claim
        bool claimed;
    }

    uint256 public nextGameId = 1;
    mapping(uint256 => Game) private games;

    event GameCreated(uint256 indexed gameId, address indexed creator, uint8[5] publicCards);
    event GameJoined(uint256 indexed gameId, address indexed joiner);
    event SelectionSubmitted(uint256 indexed gameId, address indexed player);
    event Opened(uint256 indexed gameId);
    event Claimed(uint256 indexed gameId, address indexed winner, uint256 amount);

    /// @notice Create a new game with 5 random public cards
    function createGame() external payable returns (uint256 gameId) {
        require(msg.value == STAKE, "Invalid stake");

        gameId = nextGameId++;

        uint8[13] memory deck;
        for (uint8 i = 0; i < 13; i++) deck[i] = i + 1;

        // Fisher-Yates shuffle first 5 positions using weak randomness (acceptable for test/demo)
        uint256 rand = uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, msg.sender, gameId)));
        for (uint8 i = 0; i < 5; i++) {
            uint8 j = uint8(rand % (13 - i)) + i; // pick index in [i,12]
            (deck[i], deck[j]) = (deck[j], deck[i]);
            rand = uint256(keccak256(abi.encodePacked(rand, i)));
        }

        uint8[5] memory cards = [deck[0], deck[1], deck[2], deck[3], deck[4]];

        Game storage g = games[gameId];
        g.player1 = msg.sender;
        g.publicCards = cards;
        g.status = GameStatus.WaitingForPlayer;

        emit GameCreated(gameId, msg.sender, cards);
    }

    /// @notice Join an existing game as the second player
    function joinGame(uint256 gameId) external payable {
        require(msg.value == STAKE, "Invalid stake");
        Game storage g = games[gameId];
        require(g.player1 != address(0), "Game not found");
        require(g.player2 == address(0), "Full");
        require(msg.sender != g.player1, "Creator cannot join");

        g.player2 = msg.sender;
        g.status = GameStatus.WaitingSelections;

        emit GameJoined(gameId, msg.sender);
    }

    /// @notice Submit encrypted selection along with an off-chain signature over (gameId, choice)
    /// @dev Signature is EIP-191 (eth_sign) over keccak256(abi.encode(gameId, choice))
    function submitSelection(uint256 gameId, externalEuint8 selection, bytes calldata proof, bytes calldata signature)
        external
    {
        Game storage g = games[gameId];
        require(g.player1 != address(0) && g.player2 != address(0), "Not ready");
        require(g.status == GameStatus.WaitingSelections, "Not accepting selections");
        require(msg.sender == g.player1 || msg.sender == g.player2, "Not a player");

        euint8 enc = FHE.fromExternal(selection, proof);

        if (msg.sender == g.player1) {
            require(!g.hasSel1, "Already submitted");
            g.sel1 = enc;
            g.hasSel1 = true;
            g.sig1 = signature;
            // allow contract to operate and the submitter to decrypt
            FHE.allowThis(g.sel1);
            FHE.allow(g.sel1, g.player1);
        } else {
            require(!g.hasSel2, "Already submitted");
            g.sel2 = enc;
            g.hasSel2 = true;
            g.sig2 = signature;
            FHE.allowThis(g.sel2);
            FHE.allow(g.sel2, g.player2);
        }

        emit SelectionSubmitted(gameId, msg.sender);

        // When both selections provided, open the game and allow both players to decrypt both selections
        if (g.hasSel1 && g.hasSel2) {
            // Share ACL with both players
            FHE.allow(g.sel1, g.player2);
            FHE.allow(g.sel2, g.player1);

            g.status = GameStatus.Opened;
            emit Opened(gameId);
        }
    }

    /// @notice Claim the pot by revealing both plaintext choices validated by both players' signatures
    /// @param choice1 Clear selection of player1 (1..13)
    /// @param choice2 Clear selection of player2 (1..13)
    function claim(uint256 gameId, uint8 choice1, uint8 choice2) external {
        Game storage g = games[gameId];
        require(g.status == GameStatus.Opened, "Not opened");
        require(!g.claimed, "Already claimed");

        // Verify choices are valid cards and within the 5-card board
        require(_inBoard(g.publicCards, choice1), "p1 not in board");
        require(_inBoard(g.publicCards, choice2), "p2 not in board");

        // Verify signatures bind each player to their selection
        bytes32 digest1 = keccak256(abi.encode(gameId, choice1));
        bytes32 digest2 = keccak256(abi.encode(gameId, choice2));
        address rec1 = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(digest1), g.sig1);
        address rec2 = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(digest2), g.sig2);
        require(rec1 == g.player1, "bad sig1");
        require(rec2 == g.player2, "bad sig2");

        if (choice1 == choice2) {
            // both lose, funds remain locked
            g.winner = address(0);
            g.claimed = true;
            g.status = GameStatus.Finished;
            emit Claimed(gameId, address(0), 0);
            return;
        }

        address winner = choice1 > choice2 ? g.player1 : g.player2;
        g.winner = winner;
        g.claimed = true;
        g.status = GameStatus.Finished;

        uint256 amount = 2 * STAKE;
        (bool ok, ) = winner.call{value: amount}("");
        require(ok, "transfer failed");

        emit Claimed(gameId, winner, amount);
    }

    function getGame(uint256 gameId)
        external
        view
        returns (
            address player1,
            address player2,
            uint8[5] memory publicCards,
            bool hasSel1,
            bool hasSel2,
            GameStatus status,
            address winner,
            bool claimed
        )
    {
        Game storage g = games[gameId];
        player1 = g.player1;
        player2 = g.player2;
        publicCards = g.publicCards;
        hasSel1 = g.hasSel1;
        hasSel2 = g.hasSel2;
        status = g.status;
        winner = g.winner;
        claimed = g.claimed;
    }

    function getSelections(uint256 gameId) external view returns (euint8 sel1, euint8 sel2) {
        Game storage g = games[gameId];
        sel1 = g.sel1;
        sel2 = g.sel2;
    }

    function _inBoard(uint8[5] memory board, uint8 v) private pure returns (bool) {
        for (uint256 i = 0; i < 5; i++) {
            if (board[i] == v) return true;
        }
        return false;
    }
}
