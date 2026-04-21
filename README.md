# AttendChain — Blockchain Student Attendance DApp
 
A decentralised application for recording student attendance on the Ethereum Sepolia testnet. Built with Solidity, Ethers.js v5, and vanilla HTML/CSS/JS.
 
## Tech Stack
- **Smart Contract:** Solidity ^0.8.0
- **Network:** Ethereum Sepolia Testnet
- **Contract Address:** `0xa47Ce87db7a29BaDC2B3aFAEa1E9c9deE25E4608`
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Blockchain Library:** Ethers.js v5 (CDN)
- **Wallet:** MetaMask
## Project Structure
```
attendchain-dapp/
├── Attendance.sol      # Smart contract
├── index.html          # App entry point
├── style.css           # Styling
└── app.js              # DApp logic
```
 
## Requirements
- [MetaMask](https://metamask.io/) browser extension
- Sepolia testnet ETH — get it free from https://sepoliafaucet.com
- A modern browser (Chrome, Brave, Firefox)
## Setup & Running
1. Clone the repository
2. Open `index.html` directly in your browser
3. Connect MetaMask and switch to **Sepolia Testnet**
4. The app auto-detects your role (Teacher or Student)
No `npm install` needed to run the app. If you want the dev tools:
```
npm install
npx serve .
```
 
## Usage
 
**Teacher** (contract deployer wallet):
- Create classes, start/end sessions
- Register students by wallet address
- Mark attendance during active sessions
**Student** (registered wallet):
- View personal attendance records
- Check session status per class
- See attendance percentage per class
## Smart Contract
Deployed via Remix IDE to Sepolia. Key functions:
 
| Function | Access | Description |
|---|---|---|
| `createClass()` | Teacher | Create a new class |
| `startSession()` | Teacher | Open attendance for a class |
| `endSession()` | Teacher | Close attendance |
| `addStudent()` | Teacher | Register a student |
| `markAttendance()` | Teacher | Record present/absent |
| `getAttendanceRecords()` | Public | View student records |
| `getAttendancePercentage()` | Public | Get attendance % |
 
## License
MIT