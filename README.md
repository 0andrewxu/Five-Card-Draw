# Five Card Draw - Privacy-Preserving Blockchain Card Game

A decentralized two-player card game built with Fully Homomorphic Encryption (FHE) technology, enabling completely private card selection on the Ethereum blockchain. Players can make strategic choices without revealing their selections until both players have committed, ensuring true privacy and fairness in on-chain gaming.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Game Mechanics](#game-mechanics)
- [Smart Contract Details](#smart-contract-details)
- [Installation & Setup](#installation--setup)
- [Usage Guide](#usage-guide)
- [Development](#development)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security Considerations](#security-considerations)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Support & Community](#support--community)

---

## Overview

**Five Card Draw** is a blockchain-based card game that demonstrates the power of Fully Homomorphic Encryption (FHE) in decentralized applications. Unlike traditional blockchain games where all data is transparent, this game leverages Zama's FHEVM technology to enable players to make encrypted selections that remain private until both players have committed their choices.

The game implements a simplified variant of poker where two players compete by selecting cards from a shared board of five public cards (numbered 1-13). Each player stakes 0.001 ETH, and the player with the higher card wins the entire pot of 0.002 ETH. The game showcases how FHE can solve the fundamental privacy problem in on-chain gaming.

---

## Key Features

### Privacy-First Design
- **Encrypted Card Selection**: Player choices are encrypted using Fully Homomorphic Encryption (FHE) and stored on-chain without revealing the actual values
- **Fair Gameplay**: Neither player can see the opponent's selection until both have committed, preventing cheating and front-running
- **Cryptographic Signatures**: Players sign their selections off-chain using EIP-191 signatures for verification during the claim phase

### Blockchain Integration
- **Smart Contract Security**: Fully auditable Solidity smart contracts deployed on Ethereum Sepolia testnet
- **Non-Custodial**: Players maintain full control of their funds and encrypted data
- **Transparent Game Logic**: All game rules are enforced by immutable smart contracts

### User Experience
- **Modern Web3 Interface**: React-based frontend with RainbowKit wallet integration
- **Real-Time Updates**: Automatic game state synchronization using wagmi hooks
- **Mobile-Responsive**: Fully functional on desktop and mobile devices
- **MetaMask Integration**: Seamless wallet connectivity and transaction signing

### Economic Model
- **Fixed Stakes**: Each player deposits exactly 0.001 ETH to create or join a game
- **Winner Takes All**: The player with the higher card wins 0.002 ETH
- **Tie Handling**: If both players select the same card, the pot is locked (no winner)

---

## Problem Statement

Traditional blockchain applications face a fundamental transparency problem: all data stored on-chain is publicly visible. This creates several critical challenges for on-chain gaming:

### 1. **Privacy Leak in Strategy Games**
In card games, poker, or any game requiring hidden information, players' choices must remain secret until a reveal phase. On traditional blockchains, any value stored in a smart contract's state can be read by anyone, making truly private gameplay impossible.

### 2. **Front-Running Vulnerability**
Even if players submit hashed commitments, malicious actors can monitor the mempool and front-run transactions based on observable patterns, gaining unfair advantages.

### 3. **Trusted Third Parties**
Existing solutions often rely on off-chain servers or trusted oracles to maintain privacy, reintroducing centralization and trust assumptions into decentralized applications.

### 4. **Complex Commit-Reveal Schemes**
Traditional commit-reveal patterns require multiple transaction rounds, increase gas costs, and create poor user experiences with lengthy waiting periods.

### 5. **Verifiability vs. Privacy Trade-off**
Blockchain applications must balance transparency (for verification) with privacy (for user protection), and conventional cryptography forces developers to choose one over the other.

---

## Solution

**Five Card Draw** leverages **Fully Homomorphic Encryption (FHE)** via Zama's FHEVM protocol to solve these challenges:

### How FHE Solves the Privacy Problem

1. **Encrypted Computation**: FHE allows computations to be performed directly on encrypted data without decryption. Players submit encrypted card selections that remain encrypted on-chain.

2. **No Premature Reveals**: The smart contract can store and verify encrypted values without exposing the plaintext, ensuring no player can see the opponent's choice before committing their own.

3. **Trustless Decryption**: When both players have committed, the FHE protocol enables controlled decryption where both players can verify each other's choices without a trusted third party.

4. **Single-Phase Commitment**: Unlike traditional commit-reveal schemes requiring multiple transactions, FHE enables secure single-transaction submissions with cryptographic signatures.

5. **On-Chain Verification**: The smart contract verifies signatures and encrypted data on-chain, ensuring all game logic remains decentralized and auditable.

### Key Technical Innovations

- **Access Control Lists (ACL)**: Zama's FHEVM includes fine-grained access controls allowing only authorized addresses to decrypt specific ciphertext
- **External Encrypted Inputs**: Players generate encrypted inputs off-chain using the Zama SDK and submit them with zero-knowledge proofs
- **User Decryption Protocol**: Players use their wallet signatures to decrypt values through the Zama relayer service
- **Cryptographic Binding**: EIP-191 signatures bind players to their plaintext choices, enabling verification during the claim phase

---

## Technology Stack

### Smart Contracts & Blockchain
- **Solidity ^0.8.24**: Smart contract programming language
- **FHEVM by Zama**: Fully Homomorphic Encryption virtual machine for Ethereum
  - `@fhevm/solidity ^0.8.0`: FHE Solidity library
  - `@zama-fhe/oracle-solidity ^0.1.0`: Decryption oracle integration
- **Hardhat ^2.26.0**: Ethereum development environment
  - `@fhevm/hardhat-plugin ^0.1.0`: FHEVM integration for Hardhat
  - `hardhat-deploy ^0.11.45`: Contract deployment management
- **OpenZeppelin Contracts**: Industry-standard cryptographic utilities (ECDSA, EIP712)
- **TypeChain ^8.3.2**: TypeScript bindings for smart contracts

### Frontend
- **React ^19.1.1**: Modern JavaScript UI library
- **TypeScript ~5.8.3**: Type-safe JavaScript development
- **Vite ^7.1.6**: Fast frontend build tool
- **RainbowKit ^2.2.8**: Beautiful wallet connection UI
- **Wagmi ^2.17.0**: React hooks for Ethereum
- **Viem ^2.37.6**: TypeScript-first Ethereum library
- **TanStack Query ^5.89.0**: Data synchronization and state management
- **Ethers.js ^6.15.0**: Ethereum wallet interactions

### Development Tools
- **ESLint**: Code linting and quality enforcement
- **Prettier**: Code formatting
- **Solhint**: Solidity linting
- **Mocha & Chai**: Testing framework
- **Hardhat Gas Reporter**: Gas optimization analysis
- **Solidity Coverage**: Test coverage reporting

### Infrastructure
- **Ethereum Sepolia Testnet**: Layer 1 testnet deployment
- **Zama Relayer SDK ^0.2.0**: FHE decryption service integration
- **Infura**: Ethereum node provider
- **Etherscan**: Contract verification and block explorer

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                       │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ RainbowKit   │  │   Wagmi     │  │  Zama FHE SDK    │   │
│  │ (Wallet UI)  │  │  (Hooks)    │  │  (Encryption)    │   │
│  └──────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Ethereum Sepolia Testnet                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         FiveCardDraw Smart Contract                  │    │
│  │  • Game state management                             │    │
│  │  • FHE encrypted storage (euint8)                    │    │
│  │  • Signature verification (ECDSA)                    │    │
│  │  • Winner determination logic                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Zama FHEVM Protocol                        │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ FHE Executor │  │     ACL     │  │ Decryption Oracle│   │
│  │ (Encrypted   │  │ (Access     │  │ (User Decrypt)   │   │
│  │  Compute)    │  │  Control)   │  │                  │   │
│  └──────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Game Creation**:
   - Player 1 calls `createGame()` with 0.001 ETH
   - Contract generates 5 random cards (1-13) using block randomness
   - Game state initialized with status `WaitingForPlayer`

2. **Game Join**:
   - Player 2 calls `joinGame(gameId)` with 0.001 ETH
   - Contract validates stake and updates status to `WaitingSelections`

3. **Encrypted Selection Submission**:
   - Player generates encrypted input using Zama SDK: `instance.createEncryptedInput()`
   - Player signs digest of (gameId, choice) using EIP-191
   - Player submits `submitSelection(gameId, encryptedChoice, proof, signature)`
   - Contract stores encrypted value as `euint8` type
   - When both selections submitted, status becomes `Opened`

4. **Claim & Reveal**:
   - Either player initiates `claim(gameId, choice1, choice2)`
   - Contract verifies both signatures match the provided plaintext choices
   - Contract determines winner: higher card wins, tie means no winner
   - Winner receives 0.002 ETH payout

### Smart Contract State Machine

```
WaitingForPlayer → WaitingSelections → Opened → Finished
       ↓                  ↓               ↓         ↓
   Player1 joins    Both players    Both reveal  Funds
                    submit FHE      plaintext    claimed
                   selections       choices
```

---

## Game Mechanics

### Game Setup
1. **Stake Requirement**: Each player must deposit exactly 0.001 ETH (1000000000000000 wei)
2. **Card Deck**: The game uses a single suit of 13 cards (values 1 through 13)
3. **Public Board**: 5 cards are randomly drawn and displayed publicly to both players
4. **Player Limit**: Exactly 2 players per game (creator + joiner)

### Gameplay Flow

**Phase 1: Game Creation**
- Player A creates a game by staking 0.001 ETH
- Contract generates 5 random public cards using Fisher-Yates shuffle
- Game enters `WaitingForPlayer` state
- Game ID is emitted in `GameCreated` event

**Phase 2: Game Join**
- Player B joins the game using the game ID and stakes 0.001 ETH
- Contract validates that Player B is not the same as Player A
- Game transitions to `WaitingSelections` state
- `GameJoined` event is emitted

**Phase 3: Secret Selection**
- Each player independently chooses one card from the 5 public cards
- Player encrypts their choice using Zama FHE SDK
- Player signs a message containing (gameId, choice) using their wallet
- Player submits `submitSelection()` with encrypted choice + signature
- Contract stores the encrypted selection as `euint8`
- When second player submits, game automatically transitions to `Opened` state
- Both players gain decrypt access to both selections via ACL

**Phase 4: Reveal & Claim**
- Either player can call `claim()` with both plaintext choices
- Contract verifies signatures bind each player to their stated choice
- Contract compares choices and determines winner
- Winner is the player with the higher card value
- If choices are equal, both players lose (funds locked)
- Winner receives 0.002 ETH immediately
- Game transitions to `Finished` state

### Winning Conditions

| Scenario | Outcome |
|----------|---------|
| Player 1 Choice > Player 2 Choice | Player 1 wins 0.002 ETH |
| Player 2 Choice > Player 1 Choice | Player 2 wins 0.002 ETH |
| Player 1 Choice = Player 2 Choice | Tie - funds locked in contract |

### Edge Cases & Rules

- **Duplicate Selection Allowed**: Both players can choose the same card
- **No Time Limits**: Players can take unlimited time to submit selections
- **No Cancellation**: Once a game is created and joined, stakes are locked until completion
- **No Partial Reveals**: Both selections must be revealed simultaneously
- **Signature Validation**: Incorrect signatures prevent claiming
- **Invalid Card Protection**: Claims with cards not on the board are rejected

---

## Smart Contract Details

### Contract: `FiveCardDraw.sol`

**Location**: `/contracts/FiveCardDraw.sol`

**Key State Variables**:
```solidity
uint256 public constant STAKE = 1e15; // 0.001 ether
uint256 public nextGameId = 1;
mapping(uint256 => Game) private games;
```

**Game Struct**:
```solidity
struct Game {
    address player1;          // Game creator
    address player2;          // Second player
    uint8[5] publicCards;     // The 5 public cards (1-13)
    euint8 sel1;              // Player 1's encrypted selection
    euint8 sel2;              // Player 2's encrypted selection
    bool hasSel1;             // Player 1 submitted?
    bool hasSel2;             // Player 2 submitted?
    bytes sig1;               // Player 1's EIP-191 signature
    bytes sig2;               // Player 2's EIP-191 signature
    GameStatus status;        // Current game state
    address winner;           // Winner address (set after claim)
    bool claimed;             // Funds claimed?
}
```

**Game Status Enum**:
```solidity
enum GameStatus {
    WaitingForPlayer,    // 0: Only creator joined
    WaitingSelections,   // 1: Both joined, awaiting selections
    Opened,              // 2: Both selections submitted
    Finished             // 3: Game completed, winner determined
}
```

### Core Functions

#### `createGame() payable returns (uint256 gameId)`
Creates a new game with 5 random public cards.
- **Requirements**: `msg.value == 0.001 ETH`
- **Returns**: Unique game ID
- **Events**: `GameCreated(gameId, creator, publicCards)`

#### `joinGame(uint256 gameId) payable`
Join an existing game as the second player.
- **Requirements**:
  - `msg.value == 0.001 ETH`
  - Game exists and has only one player
  - Caller is not the game creator
- **Events**: `GameJoined(gameId, joiner)`

#### `submitSelection(uint256 gameId, externalEuint8 selection, bytes proof, bytes signature)`
Submit an encrypted card selection with cryptographic signature.
- **Parameters**:
  - `gameId`: The game to submit for
  - `selection`: Encrypted card choice (FHE handle)
  - `proof`: Zero-knowledge proof of encryption validity
  - `signature`: EIP-191 signature over keccak256(abi.encode(gameId, choice))
- **Requirements**:
  - Game has two players
  - Game status is `WaitingSelections`
  - Caller is one of the two players
  - Player hasn't already submitted
- **Events**: `SelectionSubmitted(gameId, player)`
- **Auto-transition**: When both selections submitted → `Opened` + ACL sharing

#### `claim(uint256 gameId, uint8 choice1, uint8 choice2)`
Reveal both plaintext choices and claim winnings.
- **Parameters**:
  - `gameId`: The game to claim
  - `choice1`: Player 1's plaintext choice
  - `choice2`: Player 2's plaintext choice
- **Requirements**:
  - Game status is `Opened`
  - Not already claimed
  - Both choices are valid cards from the board
  - Signatures verify correctly for both choices
- **Events**: `Claimed(gameId, winner, amount)`
- **Transfers**: Winner receives 0.002 ETH

#### `getGame(uint256 gameId) view returns (...)`
Retrieve public game information.
- **Returns**: player1, player2, publicCards, hasSel1, hasSel2, status, winner, claimed

#### `getSelections(uint256 gameId) view returns (euint8 sel1, euint8 sel2)`
Retrieve encrypted selections (requires decrypt permissions).
- **Returns**: Both encrypted selection handles

### Security Features

1. **Signature Verification**: Uses OpenZeppelin's ECDSA library with EIP-191 message hashing
2. **Access Control**: Zama FHE ACL prevents unauthorized decryption
3. **Reentrancy Protection**: Uses `.call{value}()` with require checks
4. **Input Validation**: All inputs validated before state changes
5. **No Admin Functions**: Fully decentralized, no owner privileges
6. **Deterministic Randomness**: Uses `block.prevrandao` for card shuffling (acceptable for testnet)

---

## Installation & Setup

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **Git**: For repository cloning
- **MetaMask**: Browser wallet extension
- **Sepolia ETH**: Test ether from a faucet

### Clone the Repository

```bash
git clone https://github.com/yourusername/Five-Card-Draw.git
cd Five-Card-Draw
```

### Install Dependencies

#### Smart Contract Dependencies
```bash
npm install
```

#### Frontend Dependencies
```bash
cd game
npm install
cd ..
```

### Environment Configuration

#### Set Hardhat Configuration Variables
```bash
# Set your wallet mnemonic (12 or 24 words)
npx hardhat vars set MNEMONIC

# Set your Infura API key (get from https://infura.io)
npx hardhat vars set INFURA_API_KEY

# Optional: Set Etherscan API key for contract verification
npx hardhat vars set ETHERSCAN_API_KEY
```

#### Configure Frontend Contract Address
After deploying your contract, update `/game/src/config/contracts.ts`:
```typescript
export const CONTRACT_ADDRESS = '0xYourDeployedContractAddress';
```

### Get Sepolia Test ETH

1. Visit Sepolia faucet: https://sepoliafaucet.com/
2. Enter your wallet address
3. Receive test ETH (may take a few minutes)

---

## Usage Guide

### For Players

#### 1. Access the Game
- Navigate to the deployed frontend URL or run locally
- Connect your MetaMask wallet on Sepolia network
- Ensure you have at least 0.002 ETH for gas + stakes

#### 2. Create a New Game
- Click "Create Game (0.001 ETH)"
- Confirm the transaction in MetaMask
- Note your Game ID (displayed on screen)
- Share the Game ID with your opponent

#### 3. Join an Existing Game
- Enter the Game ID in the input field
- Click "Join (0.001 ETH)"
- Confirm the transaction in MetaMask

#### 4. Submit Your Selection
- View the 5 public cards displayed
- Click "Pick [card number]" for your chosen card
- Sign the message in MetaMask (this is your cryptographic signature)
- Confirm the transaction to submit your encrypted choice

#### 5. Reveal & Claim
- After both players submit, the game status becomes "Opened"
- Click "Reveal & Claim 0.002 ETH"
- Sign the decryption request in MetaMask
- The app will decrypt both selections and determine the winner
- Winner receives 0.002 ETH automatically

### For Developers

#### Run Local Development Environment

**Start Local Hardhat Node**:
```bash
npx hardhat node
```

**Deploy Contracts to Local Network** (in new terminal):
```bash
npx hardhat deploy --network localhost
```

**Start Frontend Development Server**:
```bash
cd game
npm run dev
```

Access the app at `http://localhost:5173`

#### Deploy to Sepolia Testnet

**Deploy Smart Contract**:
```bash
npm run deploy:sepolia
```

**Verify Contract on Etherscan**:
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

**Build Production Frontend**:
```bash
cd game
npm run build
```

The production build will be in `/game/dist/`

---

## Development

### Project Structure

```
Five-Card-Draw/
├── contracts/              # Solidity smart contracts
│   ├── FiveCardDraw.sol    # Main game contract
│   └── FHECounter.sol      # Example FHE contract
├── deploy/                 # Hardhat deployment scripts
│   └── fiveCardDraw.ts     # Deployment configuration
├── test/                   # Smart contract tests
│   └── FiveCardDraw.ts     # Test suite
├── game/                   # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── GameApp.tsx      # Main game interface
│   │   │   └── Header.tsx       # App header
│   │   ├── config/
│   │   │   ├── wagmi.ts         # Wagmi/RainbowKit config
│   │   │   └── contracts.ts     # Contract ABI and address
│   │   ├── hooks/
│   │   │   ├── useZamaInstance.ts    # FHE instance hook
│   │   │   └── useEthersSigner.ts    # Ethers signer hook
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── types/                  # TypeChain generated types
├── hardhat.config.ts       # Hardhat configuration
├── package.json
└── README.md
```

### Smart Contract Development

#### Compile Contracts
```bash
npm run compile
```

#### Run Tests
```bash
npm run test
```

#### Test on Sepolia
```bash
npm run test:sepolia
```

#### Generate Test Coverage
```bash
npm run coverage
```

#### Lint Solidity Code
```bash
npm run lint:sol
```

### Frontend Development

#### Development Server with Hot Reload
```bash
cd game
npm run dev
```

#### Type Check
```bash
cd game
npm run build  # Also type-checks
```

#### Lint Frontend Code
```bash
cd game
npm run lint
```

### Code Quality

#### Run All Linters
```bash
npm run lint
```

#### Format Code
```bash
npm run prettier:write
```

#### Check Formatting
```bash
npm run prettier:check
```

### Clean Build Artifacts
```bash
npm run clean
```

---

## Deployment

### Mainnet Deployment Checklist

Before deploying to production:

- [ ] Audit smart contract code
- [ ] Replace `block.prevrandao` randomness with Chainlink VRF
- [ ] Add emergency pause functionality
- [ ] Implement time limits for game completion
- [ ] Add game cancellation logic for abandoned games
- [ ] Set up monitoring and alerting
- [ ] Verify contract on Etherscan
- [ ] Test on testnet extensively
- [ ] Update frontend contract addresses
- [ ] Deploy frontend to IPFS or Vercel
- [ ] Document deployment addresses

### Deployment Steps

#### 1. Deploy Smart Contract
```bash
npx hardhat deploy --network sepolia
# Note the deployed contract address
```

#### 2. Verify on Etherscan
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

#### 3. Update Frontend Configuration
Edit `/game/src/config/contracts.ts`:
```typescript
export const CONTRACT_ADDRESS = '0xYourContractAddress';
export const CONTRACT_ABI = [...]; // Copy from artifacts
```

#### 4. Build Frontend
```bash
cd game
npm run build
```

#### 5. Deploy Frontend
Options:
- **Vercel**: `vercel deploy`
- **Netlify**: Drag `/game/dist` to Netlify
- **IPFS**: `ipfs add -r dist/`

---

## Testing

### Smart Contract Tests

The project includes comprehensive test coverage in `/test/FiveCardDraw.ts`.

**Test Scenarios**:
- ✅ Game creation with correct stake
- ✅ Game joining with validation
- ✅ Encrypted selection submission
- ✅ Signature verification
- ✅ Winner determination logic
- ✅ ETH payout calculations
- ✅ Tie scenarios
- ✅ Error cases (invalid stakes, wrong players, etc.)

**Run Tests**:
```bash
npm run test
```

**Example Test Output**:
```
FiveCardDraw (mock)
  ✓ happy path: create, join, submit, claim (2034ms)

1 passing (2s)
```

**Coverage Report**:
```bash
npm run coverage
```

### Frontend Testing

**Manual Testing Checklist**:
- [ ] Wallet connection (MetaMask)
- [ ] Game creation transaction
- [ ] Game joining transaction
- [ ] Card selection encryption
- [ ] Signature generation
- [ ] Selection submission
- [ ] Decryption and reveal
- [ ] Winner determination
- [ ] ETH payout reception
- [ ] UI state updates
- [ ] Error handling

**Testing on Sepolia**:
1. Deploy contract to Sepolia
2. Update frontend configuration
3. Run frontend: `cd game && npm run dev`
4. Test with real transactions using MetaMask

---

## Security Considerations

### Current Implementation

**Security Strengths**:
- ✅ Encrypted card selections prevent premature reveals
- ✅ Cryptographic signatures bind players to their choices
- ✅ Access control lists restrict decryption permissions
- ✅ Input validation prevents invalid game states
- ✅ No admin privileges or centralized control
- ✅ Deterministic winner selection logic
- ✅ Reentrancy-safe ETH transfers

**Known Limitations** (Testnet/Demo):
- ⚠️ **Weak Randomness**: Uses `block.prevrandao` which can be influenced by miners
- ⚠️ **No Time Limits**: Games can remain incomplete indefinitely
- ⚠️ **No Cancellation**: Funds locked if opponent never joins/submits
- ⚠️ **Tie Punishment**: Equal selections permanently lock funds
- ⚠️ **No Dispute Resolution**: No mechanism for resolving incorrect claims
- ⚠️ **Single-Game Limit**: No multi-round or tournament support

### Recommendations for Production

1. **Improve Randomness**:
   - Use Chainlink VRF for verifiable random card generation
   - Implement commit-reveal with entropy contributions from both players

2. **Add Time Constraints**:
   - Implement block-based timeouts for each game phase
   - Allow cancellation and refunds if opponent abandons game

3. **Handle Ties Better**:
   - Return stakes to both players instead of locking funds
   - Or implement tiebreaker rules

4. **Add Circuit Breakers**:
   - Emergency pause function for critical bugs
   - Upgrade path for contract logic

5. **Gas Optimization**:
   - Use more efficient data structures
   - Batch operations where possible

6. **Comprehensive Auditing**:
   - Third-party security audit before mainnet deployment
   - Formal verification of critical functions

7. **Frontend Security**:
   - Implement CSP headers
   - Use secure RPC endpoints
   - Add rate limiting

---

## Future Roadmap

### Phase 1: Core Improvements (Q2 2025)
- [ ] Implement Chainlink VRF for provably fair randomness
- [ ] Add game timeout and automatic refund logic
- [ ] Improve tie-handling (return stakes instead of locking)
- [ ] Optimize gas usage in smart contracts
- [ ] Add comprehensive error messages and user feedback

### Phase 2: Enhanced Gameplay (Q3 2025)
- [ ] Multi-round tournaments with leaderboards
- [ ] Variable stake amounts (configurable by creator)
- [ ] Full 52-card deck with suits
- [ ] Multiple card selection (draw 2-5 cards)
- [ ] Poker hand evaluation (pairs, straights, flushes)
- [ ] Spectator mode for watching ongoing games

### Phase 3: Platform Features (Q4 2025)
- [ ] On-chain matchmaking system
- [ ] ERC-20 token staking support (not just ETH)
- [ ] NFT reward system for tournament winners
- [ ] Player profiles and statistics
- [ ] Reputation system based on game history
- [ ] Mobile app (React Native)

### Phase 4: Advanced Privacy (Q1 2026)
- [ ] Multi-party computation for larger games (3+ players)
- [ ] Zero-knowledge proofs for hand validation
- [ ] Private shuffle protocols
- [ ] Encrypted chat between players
- [ ] Anonymous gameplay mode

### Phase 5: Scaling & Ecosystem (Q2 2026)
- [ ] Deploy to Layer 2 networks (Arbitrum, Optimism)
- [ ] Cross-chain gameplay via bridges
- [ ] Developer SDK for building FHE games
- [ ] Game template library
- [ ] Grant program for FHE game developers

### Research Directions
- Exploration of additional FHE primitives for complex game logic
- Integration with zero-knowledge rollups for scalability
- Decentralized storage for game history and replays
- AI-resistant bot detection using behavioral analysis
- Fair revenue sharing models for game creators

---

## Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### How to Contribute

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/Five-Card-Draw.git
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow existing code style and conventions
   - Add tests for new functionality
   - Update documentation as needed

4. **Run Tests and Linting**
   ```bash
   npm run test
   npm run lint
   ```

5. **Commit Your Changes**
   ```bash
   git commit -m "Add feature: description of your changes"
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Describe your changes in detail
   - Reference any related issues
   - Wait for review and address feedback

### Development Guidelines

**Code Style**:
- Use TypeScript for all new frontend code
- Follow Solidity style guide for smart contracts
- Use meaningful variable and function names
- Add comments for complex logic

**Testing Requirements**:
- All new smart contract functions must have tests
- Aim for >80% code coverage
- Include both positive and negative test cases

**Documentation**:
- Update README.md for user-facing changes
- Add inline comments for complex algorithms
- Document all public contract functions with NatSpec

**Commit Messages**:
- Use conventional commits format
- Examples: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`

### Areas for Contribution

**Good First Issues**:
- UI/UX improvements
- Additional frontend tests
- Documentation enhancements
- Gas optimization suggestions

**Advanced Contributions**:
- Chainlink VRF integration
- Layer 2 deployment scripts
- Multi-player game variants
- Security enhancements

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help newcomers learn and grow

---

## License

This project is licensed under the **BSD-3-Clause-Clear License**.

See the [LICENSE](LICENSE) file for full details.

**Summary**:
- ✅ Free to use, modify, and distribute
- ✅ Suitable for commercial use
- ❌ No patent rights granted
- ❌ No warranty or liability

---

## Support & Community

### Get Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/Five-Card-Draw/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/yourusername/Five-Card-Draw/discussions)

### Zama Resources

- **FHEVM Documentation**: [https://docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- **Zama Discord**: [https://discord.gg/zama](https://discord.gg/zama)
- **FHEVM GitHub**: [https://github.com/zama-ai/fhevm](https://github.com/zama-ai/fhevm)

### Related Projects

- **FHEVM Hardhat Template**: [https://github.com/zama-ai/fhevm-hardhat-template](https://github.com/zama-ai/fhevm-hardhat-template)
- **Zama Bounty Program**: [https://www.zama.ai/bounty-program](https://www.zama.ai/bounty-program)

### Stay Updated

- **Twitter**: [@zama_fhe](https://twitter.com/zama_fhe)
- **Blog**: [https://www.zama.ai/blog](https://www.zama.ai/blog)

---

## Acknowledgments

- **Zama Team**: For building the incredible FHEVM protocol and providing extensive documentation
- **OpenZeppelin**: For battle-tested smart contract libraries
- **Hardhat Team**: For the best Ethereum development environment
- **RainbowKit & Wagmi**: For making Web3 frontend development a pleasure
- **All Contributors**: Thank you for your contributions to this project

---

## Disclaimer

**This is experimental software and has not been audited.**

- Use at your own risk
- Do not use with mainnet funds without thorough auditing
- The randomness implementation is not suitable for high-stakes games
- Smart contract security is critical - always verify and test thoroughly

**This project is for educational and demonstration purposes.**

---

**Built with ❤️ using Zama FHEVM**

*Bringing privacy to blockchain gaming, one encrypted card at a time.*
