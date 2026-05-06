# Hướng dẫn chạy `dat13899/stock-1` trên máy local (Antigravity IDE)

Repo có **hai** thứ chạy độc lập:

1. **ETH Keyspace Simulator** — web app Next.js (giao diện Matrix, sinh keypair trong Web Worker, không gọi mạng).
2. **Sepolia QA Wallet Manager** — 3 script Node.js (`wallet:create` / `wallet:list` / `wallet:balance`) để quản lý ví test trên Sepolia.

Hai phần **không chia sẻ state** với nhau. Có thể chạy riêng từng phần.

---

## 0. Yêu cầu hệ thống

| Tool | Phiên bản | Ghi chú |
| --- | --- | --- |
| Node.js | **>= 20.18** (khuyến nghị 22.12 LTS) | Next 16 cần Node 20+ |
| npm | >= 10 | Đi kèm Node |
| git | bất kỳ | Để clone |
| Chrome / Edge / Firefox | mới | Cho UI simulator |

Kiểm tra nhanh trong terminal Antigravity:
```bash
node --version    # phải >= v20
npm --version     # phải >= 10
git --version
```

Nếu Node chưa đúng phiên bản → cài qua [nvm](https://github.com/nvm-sh/nvm) (Linux/macOS) hoặc [nvm-windows](https://github.com/coreybutler/nvm-windows):
```bash
nvm install 22
nvm use 22
```

---

## 1. Lấy code về

Trong terminal:
```bash
git clone https://github.com/dat13899/stock-1.git
cd stock-1
```

Mở thư mục `stock-1` này làm workspace trong **Antigravity** (`File → Open Folder…` → chọn `stock-1`). Antigravity sẽ tự nhận diện `package.json` và `tsconfig.json`.

---

## 2. Cài dependencies

```bash
npm install
```

Lần đầu mất ~30–60s. Sẽ kéo về `next`, `react`, `tailwindcss`, `@noble/secp256k1`, `@noble/hashes`, `ethers` v6, v.v.

Nếu thấy warning về deprecated package → bỏ qua, không ảnh hưởng chức năng.

---

## 3. Chạy ETH Keyspace Simulator (web UI)

### Dev mode (hot reload)

```bash
npm run dev
```

Output sẽ hiện:
```
   ▲ Next.js 16.x
   - Local:        http://localhost:3000

 ✓ Ready in ...
```

Mở **http://localhost:3000** trong Chrome.

### Cách dùng UI

1. Click nút xanh **`► START`** ở góc phải — Web Worker bắt đầu sinh keypair.
2. Quan sát:
   - **HASHES / SEC** — nên ≥ 200 trên laptop hiện đại (test của tôi đo được ~1,000–1,300 trên VM).
   - **TOTAL GENERATED** — đếm tăng liên tục.
   - **Throughput chart** — biểu đồ sparkline 60 mẫu cuối.
   - **KEYSTREAM SAMPLE** — ~1 ví/500 keys hiện ra (private key bị mask `0xXXXX…XXXX`, click để toggle).
3. Trong panel **VANITY PROBABILITY**, gõ prefix sau `0x` (vd `dead`, `0000`, `cafe`):
   - Hiện luôn search-space (16^N), mean/median/p99 attempts, ETA theo rate hiện tại.
4. Trong panel **TARGET VANITY PREFIX**, nếu gõ trước khi click Start, worker sẽ thực sự tìm match. Match được hiện ở **VANITY MATCHES (THIS SESSION)**.
5. Click **`■ STOP`** để dừng.

> **Lưu ý hiện tại (chưa fix):** nếu gõ prefix vào panel VANITY PROBABILITY *sau khi đã Start*, UI sẽ update label nhưng worker vẫn chạy với prefix cũ → không có match. Workaround: Stop, sửa prefix ở thanh trên cùng (TARGET VANITY PREFIX), rồi Start lại.

### Build production

```bash
npm run build
npm start          # chạy bản đã build, port 3000
```

### Lint & typecheck

```bash
npm run lint       # ESLint (Next.js preset)
```

---

## 4. Chạy Sepolia QA Wallet Manager (Node CLI)

3 script này độc lập với simulator. Có thể chạy mà không cần `npm run dev`.

### 4.1. Tạo 1 ví mới (đặt tên bắt buộc)

```bash
npm run wallet:create -- --name alice
```

> Lưu ý: phải có `--` trước `--name` để npm forward argument vào Node script.

Kết quả:
- File `wallets.json` được tạo ở root repo (mode `0600` — chỉ owner đọc/ghi).
- Console in ra address + private key bị mask + mnemonic bị giấu.
- Nếu `--name alice` đã tồn tại → script báo lỗi và exit 1 (không sinh trùng).

Tuỳ chọn:
```bash
npm run wallet:create -- --name bob --purpose "team B QA, sprint 12"
```

### 4.2. Liệt kê ví đã có

```bash
npm run wallet:list                       # mặc định: mask private key + mnemonic
npm run wallet:list -- --show-secrets     # hiện đầy đủ (cảnh giác)
```

### 4.3. Check balance Sepolia

```bash
npm run wallet:balance                                                 # default RPC publicnode
npm run wallet:balance -- --rpc https://sepolia.gateway.tenderly.co    # custom RPC tuỳ chọn
```

Output sẽ hiện banner `// Sepolia (chainId 11155111) via <rpc>` rồi balance từng ví.

> **Cơ chế an toàn — không thể bỏ qua:** trước khi query balance, script gọi `eth_chainId`. Nếu RPC không phải `11155111` (Sepolia) → script exit 1 với error `chainId X, expected 11155111`. Đã test với mainnet `https://ethereum-rpc.publicnode.com` và bị reject đúng như thiết kế.

### 4.4. Funding ví test

Address mới có balance 0. Để có Sepolia ETH (chỉ test, không tiền thật):

- https://sepoliafaucet.com (Alchemy)
- https://www.infura.io/faucet/sepolia
- https://faucet.quicknode.com/ethereum/sepolia
- https://www.alchemy.com/faucets/ethereum-sepolia

Paste address vào, đợi vài phút, rồi chạy lại `npm run wallet:balance`.

---

## 5. Layout repo

```
stock-1/
├─ src/                       # ETH Keyspace Simulator (Next.js app)
│  ├─ app/                    # page.tsx, layout.tsx, globals.css
│  ├─ components/             # Simulator, Matrix rain, vanity calc, ...
│  ├─ lib/eth.ts              # privateKeyToAddress (secp256k1 + keccak256)
│  ├─ lib/vanity.ts           # math: search space, mean/median/p99
│  └─ workers/wallet.worker.ts# Web Worker — sinh key + match prefix
├─ scripts/                   # Sepolia QA tool (Node ESM)
│  ├─ _walletStore.mjs        # IO chung, hardcode SEPOLIA_CHAIN_ID
│  ├─ create-wallet.mjs       # 1 ví / lần / có name
│  ├─ list-wallets.mjs
│  └─ check-balance.mjs       # chainId guard
├─ wallets.json               # SECRET — gitignored, mode 0600
├─ test-plan.md / test-report.md
└─ package.json
```

---

## 6. Tips trong Antigravity IDE

- **Integrated terminal**: `Ctrl+`` (backtick) để mở terminal trong IDE. Chạy `npm run dev` ở đây để giữ log realtime.
- **Run multiple terminals**: tab dấu `+` ở góc phải terminal panel — có thể giữ `npm run dev` ở tab 1, chạy `npm run wallet:*` ở tab 2.
- **Debug Next.js**: tạo `.vscode/launch.json` (Antigravity dùng schema VS Code):
  ```json
  {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "next dev",
        "type": "node",
        "request": "launch",
        "runtimeExecutable": "npm",
        "runtimeArgs": ["run", "dev"],
        "cwd": "${workspaceFolder}",
        "console": "integratedTerminal"
      }
    ]
  }
  ```
  Rồi F5 để debug breakpoint trong `src/`.
- **Edit on save**: bật ESLint extension nếu chưa có để thấy lỗi inline.
- **Agent (Gemini)** trong Antigravity: có thể paste link PR https://github.com/dat13899/stock-1/pull/1 và yêu cầu nó giải thích từng file.

---

## 7. Troubleshooting

| Lỗi | Cách xử lý |
| --- | --- |
| `Error: listen EADDRINUSE: 0.0.0.0:3000` | Port 3000 đang bận. Chạy `npm run dev -- -p 3001` hoặc kill process: Linux/macOS `lsof -ti:3000 \| xargs kill`, Windows `netstat -ano \| findstr :3000` rồi `taskkill /PID <pid> /F`. |
| `EACCES: permission denied, open 'wallets.json'` | File mode `0600`, đảm bảo bạn chạy script với cùng user đã tạo file. Nếu cần reset: `chmod 600 wallets.json` (Linux/macOS) hoặc xoá file đi tạo lại. |
| `error: RPC at … reports chainId 1, expected 11155111` | Bạn đưa RPC mainnet/khác Sepolia. Đúng theo thiết kế — đổi RPC sang Sepolia. |
| `failed to reach RPC … (network error)` | RPC public bị rate limit / sập tạm thời. Thử RPC khác: `--rpc https://sepolia.gateway.tenderly.co` hoặc `https://rpc.sepolia.org`. |
| `Module not found: Can't resolve 'fs'` khi chạy simulator | Bạn import code Node vào client component. Simulator KHÔNG được dùng `ethers`/`fs`/`path`. Chỉ dùng `@noble/secp256k1` + `@noble/hashes`. |
| `npm run dev` hiện browser không có Matrix rain | Hard reload Ctrl+Shift+R. Nếu vẫn trắng, kiểm tra console DevTools — có thể là CSP block `wasm-eval` (rare). |
| `wallets.json` bị commit nhầm | `git rm --cached wallets.json && git commit -m "chore: untrack wallets.json"`. File đã có trong `.gitignore`, nhưng nếu add `-f` thì git vẫn track. |

---

## 8. Một vài kiểm tra nhanh sau khi setup

```bash
# (1) lint OK
npm run lint

# (2) build production OK
npm run build

# (3) Sepolia QA round-trip
rm -f wallets.json
npm run wallet:create -- --name alice
npm run wallet:list
npm run wallet:balance
# ↑ phải in "0.0 SepoliaETH" và "// total across all wallets: 0.0 SepoliaETH"

# (4) chainId guard hoạt động
npm run wallet:balance -- --rpc https://ethereum-rpc.publicnode.com
# ↑ phải báo "chainId 1, expected 11155111" và exit non-zero
```

Nếu cả 4 bước trên chạy ngon → môi trường local OK.

---

## 9. An toàn — đọc trước khi rời máy

- `wallets.json` chứa **private key + mnemonic thật** (kể cả là Sepolia testnet, key đó vẫn có thể nhận ETH thật trên Mainnet). **Không** commit, không dán vào chat, không share.
- Chỉ dùng các ví trong `wallets.json` cho **Sepolia testnet QA**. Đừng nạp tiền thật vào.
- Nếu vô tình lộ key, coi như ví đó "burnt": tạo ví mới (`wallet:create -- --name foo-2`), bỏ ví cũ.
- Simulator KHÔNG export key ra disk dưới bất kỳ hình thức nào — keystream chỉ là sample in-memory để visualize.

---

Có vấn đề gì khi setup, dán log lỗi cho tôi rồi tôi giúp debug.
