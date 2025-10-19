// Contract on Sepolia. Set after deploying (must not use localhost).
export const CONTRACT_ADDRESS = '';

// ABI copied from artifacts for FiveCardDraw
export const CONTRACT_ABI = [
  { "inputs": [], "name": "ECDSAInvalidSignature", "type": "error" },
  { "inputs": [{ "internalType": "uint256", "name": "length", "type": "uint256" }], "name": "ECDSAInvalidSignatureLength", "type": "error" },
  { "inputs": [{ "internalType": "bytes32", "name": "s", "type": "bytes32" }], "name": "ECDSAInvalidSignatureS", "type": "error" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "winner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" } ], "name": "Claimed", "type": "event" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "creator", "type": "address" }, { "indexed": false, "internalType": "uint8[5]", "name": "publicCards", "type": "uint8[5]" } ], "name": "GameCreated", "type": "event" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "joiner", "type": "address" } ], "name": "GameJoined", "type": "event" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" } ], "name": "Opened", "type": "event" },
  { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "player", "type": "address" } ], "name": "SelectionSubmitted", "type": "event" },
  { "inputs": [], "name": "STAKE", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "gameId", "type": "uint256" }, { "internalType": "uint8", "name": "choice1", "type": "uint8" }, { "internalType": "uint8", "name": "choice2", "type": "uint8" } ], "name": "claim", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "createGame", "outputs": [ { "internalType": "uint256", "name": "gameId", "type": "uint256" } ], "stateMutability": "payable", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "gameId", "type": "uint256" } ], "name": "getGame", "outputs": [ { "internalType": "address", "name": "player1", "type": "address" }, { "internalType": "address", "name": "player2", "type": "address" }, { "internalType": "uint8[5]", "name": "publicCards", "type": "uint8[5]" }, { "internalType": "bool", "name": "hasSel1", "type": "bool" }, { "internalType": "bool", "name": "hasSel2", "type": "bool" }, { "internalType": "uint8", "name": "status", "type": "uint8" }, { "internalType": "address", "name": "winner", "type": "address" }, { "internalType": "bool", "name": "claimed", "type": "bool" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "gameId", "type": "uint256" } ], "name": "getSelections", "outputs": [ { "internalType": "euint8", "name": "sel1", "type": "bytes32" }, { "internalType": "euint8", "name": "sel2", "type": "bytes32" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "gameId", "type": "uint256" } ], "name": "joinGame", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [], "name": "nextGameId", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "protocolId", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "pure", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "gameId", "type": "uint256" }, { "internalType": "externalEuint8", "name": "selection", "type": "bytes32" }, { "internalType": "bytes", "name": "proof", "type": "bytes" }, { "internalType": "bytes", "name": "signature", "type": "bytes" } ], "name": "submitSelection", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

