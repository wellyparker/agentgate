// AgentGate — vanilla JS app. Zero runtime dependencies, zero CDN.
// Reads: eth_call via the connected wallet when available, otherwise a
// public BSC RPC over fetch. Writes: eth_sendTransaction only — every
// transaction is confirmed by the user in their own wallet.

(function () {
  "use strict";

  var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  var contractsDeployed =
    CONFIG.AGENT_PASS_ADDRESS.toLowerCase() !== ZERO_ADDRESS &&
    CONFIG.AGENT_GATE_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

  var state = {
    account: null,
    chainId: null,
    isAgent: null,      // null = unknown / not checked yet
    hasPass: null,
    passTokenId: null,
    totalMinted: null,
    posts: [],
    loading: false,
  };

  // ---------- tiny DOM helpers ----------
  function $(id) { return document.getElementById(id); }
  function show(el) { if (el) el.classList.remove("hidden"); }
  function hide(el) { if (el) el.classList.add("hidden"); }
  function setText(id, text) { var el = $(id); if (el) el.textContent = text; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function shortAddr(a) {
    return a ? a.slice(0, 6) + "…" + a.slice(-4) : "—";
  }
  function timeAgo(ts) {
    var s = Math.max(0, Math.floor(Date.now() / 1000) - Number(ts));
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + " min ago";
    if (s < 86400) return Math.floor(s / 3600) + " h ago";
    return Math.floor(s / 86400) + " d ago";
  }

  // ---------- minimal ABI encoder ----------
  function hexPad32(hex) {
    hex = hex.replace(/^0x/, "");
    return hex.padStart(64, "0");
  }
  function encAddress(addr) {
    return hexPad32(addr.toLowerCase());
  }
  function encUint(n) {
    return hexPad32(BigInt(n).toString(16));
  }
  function encString(str) {
    var bytes = new TextEncoder().encode(str);
    var hex = Array.prototype.map.call(bytes, function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
    var len = encUint(bytes.length);
    var padded = hex + "0".repeat((64 - (hex.length % 64)) % 64);
    // single dynamic arg: offset (0x20) + length + data
    return encUint(32) + len + padded;
  }
  function calldata(selector, argsHex) {
    return selector + (argsHex || "");
  }

  // ---------- minimal ABI decoder ----------
  function strip0x(h) { return h.replace(/^0x/, ""); }
  function word(hex, i) { return strip0x(hex).slice(i * 64, (i + 1) * 64); }
  function decUint(hex, i) {
    if (!hex || strip0x(hex).length < (i + 1) * 64) return null;
    return BigInt("0x" + word(hex, i));
  }
  function decBool(hex, i) {
    var v = decUint(hex, i);
    return v === null ? null : v !== 0n;
  }
  function decAddress(hex, i) {
    if (!hex || strip0x(hex).length < (i + 1) * 64) return null;
    return "0x" + word(hex, i).slice(24);
  }
  function decStringAt(hex, byteOffset) {
    var body = strip0x(hex);
    var lenHex = body.slice(byteOffset * 2, byteOffset * 2 + 64);
    if (lenHex.length < 64) return "";
    var len = Number(BigInt("0x" + lenHex));
    var dataHex = body.slice(byteOffset * 2 + 64, byteOffset * 2 + 64 + len * 2);
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = parseInt(dataHex.slice(i * 2, i * 2 + 2), 16);
    return new TextDecoder().decode(bytes);
  }
  // getPost returns (address author, string message, uint256 timestamp)
  function decGetPost(hex) {
    var author = decAddress(hex, 0);
    var offset = decUint(hex, 1);
    var timestamp = decUint(hex, 2);
    var message = offset === null ? "" : decStringAt(hex, Number(offset));
    return { author: author, message: message, timestamp: timestamp };
  }

  // ---------- JSON-RPC ----------
  function hasProvider() {
    return typeof window.ethereum !== "undefined" && window.ethereum !== null;
  }

  function rpcFetch(url, method, params) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params }),
    }).then(function (res) {
      if (!res.ok) throw new Error("RPC HTTP " + res.status);
      return res.json();
    }).then(function (json) {
      if (json.error) throw new Error(json.error.message || "RPC error");
      return json.result;
    });
  }

  // eth_call: prefer the injected wallet (it already knows the chain),
  // fall back to public RPCs in order.
  function ethCall(to, data) {
    if (hasProvider() && state.chainId === CONFIG.CHAIN_ID) {
      return window.ethereum.request({
        method: "eth_call",
        params: [{ to: to, data: data }, "latest"],
      }).catch(function () { return ethCallPublic(to, data); });
    }
    return ethCallPublic(to, data);
  }

  function ethCallPublic(to, data) {
    var urls = CONFIG.RPC_URLS.slice();
    function attempt() {
      var url = urls.shift();
      if (!url) return Promise.reject(new Error("All public RPC endpoints failed"));
      return rpcFetch(url, "eth_call", [{ to: to, data: data }, "latest"])
        .catch(function () { return attempt(); });
    }
    return attempt();
  }

  function getReceipt(txHash) {
    if (hasProvider()) {
      return window.ethereum.request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      });
    }
    return rpcFetch(CONFIG.RPC_URLS[0], "eth_getTransactionReceipt", [txHash]);
  }

  function waitForReceipt(txHash, onUpdate) {
    var tries = 0;
    return new Promise(function (resolve, reject) {
      (function poll() {
        tries++;
        getReceipt(txHash).then(function (receipt) {
          if (receipt) return resolve(receipt);
          if (tries > 60) return reject(new Error("Timed out waiting for confirmation — check BscScan for the transaction status."));
          if (onUpdate) onUpdate(tries);
          setTimeout(poll, 3000);
        }).catch(function () {
          if (tries > 60) return reject(new Error("Timed out waiting for confirmation — check BscScan for the transaction status."));
          setTimeout(poll, 3000);
        });
      })();
    });
  }

  // ---------- read-only status ----------
  function checkAgentId(address) {
    var data = calldata(SELECTORS["balanceOf(address)"], encAddress(address));
    return ethCall(CONFIG.AGENT_ID_ADDRESS, data).then(function (res) {
      var bal = decUint(res, 0);
      return bal !== null && bal > 0n;
    });
  }

  function checkPass(address) {
    var data = calldata(SELECTORS["hasPass(address)"], encAddress(address));
    return ethCall(CONFIG.AGENT_PASS_ADDRESS, data).then(function (res) {
      return decBool(res, 0);
    });
  }

  function fetchPassTokenId(address) {
    var data = calldata(SELECTORS["tokenOf(address)"], encAddress(address));
    return ethCall(CONFIG.AGENT_PASS_ADDRESS, data).then(function (res) {
      var id = decUint(res, 0);
      return id === null ? null : id.toString();
    });
  }

  function fetchTotalMinted() {
    var data = calldata(SELECTORS["totalMinted()"]);
    return ethCall(CONFIG.AGENT_PASS_ADDRESS, data).then(function (res) {
      var n = decUint(res, 0);
      return n === null ? null : n.toString();
    });
  }

  function refreshStatus() {
    if (!state.account) return Promise.resolve();
    setText("status-agentid", "Checking…");
    setText("status-pass", "Checking…");
    return checkAgentId(state.account).then(function (isAgent) {
      state.isAgent = isAgent;
      setText("status-agentid", isAgent ? "Yes — Agent ID detected" : "No Agent ID found");
      $("status-agentid").className = "status-value " + (isAgent ? "ok" : "no");
      if (!contractsDeployed) {
        setText("status-pass", "Available after deploy");
        setText("status-total", "—");
        return;
      }
      return checkPass(state.account).then(function (has) {
        state.hasPass = has;
        if (has) {
          return fetchPassTokenId(state.account).then(function (id) {
            state.passTokenId = id;
            setText("status-pass", "Yes — AgentPass #" + id);
            $("status-pass").className = "status-value ok";
          });
        }
        setText("status-pass", "Not minted yet");
        $("status-pass").className = "status-value no";
        state.passTokenId = null;
      }).then(function () {
        return fetchTotalMinted().then(function (n) {
          state.totalMinted = n;
          setText("status-total", n === null ? "—" : n + " minted");
        });
      });
    }).catch(function (err) {
      setText("status-agentid", "Check failed — RPC unreachable. Retry in a moment.");
      $("status-agentid").className = "status-value warn";
      console.error(err);
    }).then(function () {
      updateActionButtons();
    });
  }

  // ---------- board ----------
  function fetchPostCount() {
    var data = calldata(SELECTORS["postCount()"]);
    return ethCall(CONFIG.AGENT_GATE_ADDRESS, data).then(function (res) {
      var n = decUint(res, 0);
      return n === null ? 0 : Number(n);
    });
  }

  function fetchPost(id) {
    var data = calldata(SELECTORS["getPost(uint256)"], encUint(id));
    var votesData = calldata(SELECTORS["upvotes(uint256)"], encUint(id));
    return Promise.all([
      ethCall(CONFIG.AGENT_GATE_ADDRESS, data),
      ethCall(CONFIG.AGENT_GATE_ADDRESS, votesData),
    ]).then(function (results) {
      var post = decGetPost(results[0]);
      var votes = decUint(results[1], 0);
      post.id = id;
      post.upvotes = votes === null ? 0 : Number(votes);
      return post;
    });
  }

  function refreshBoard() {
    var list = $("post-list");
    if (!contractsDeployed) {
      list.innerHTML = '<p class="muted">The board opens once the contracts are deployed.</p>';
      return Promise.resolve();
    }
    list.innerHTML = '<p class="muted">Loading posts…</p>';
    return fetchPostCount().then(function (count) {
      if (count === 0) {
        list.innerHTML = '<p class="muted">No posts yet. Be the first to post once you hold an AgentPass.</p>';
        state.posts = [];
        return;
      }
      var ids = [];
      var start = Math.max(0, count - CONFIG.MAX_POSTS_SHOWN);
      for (var i = count - 1; i >= start; i--) ids.push(i);
      return Promise.all(ids.map(function (id) {
        return fetchPost(id).catch(function () { return null; });
      })).then(function (posts) {
        state.posts = posts.filter(function (p) { return p !== null; });
        renderBoard();
      });
    }).catch(function (err) {
      list.innerHTML = '<p class="muted">Could not load the board — the RPC may be slow. ' +
        '<button class="link-btn" id="board-retry">Retry</button></p>';
      var retry = $("board-retry");
      if (retry) retry.addEventListener("click", refreshBoard);
      console.error(err);
    });
  }

  function renderBoard() {
    var list = $("post-list");
    if (state.posts.length === 0) {
      list.innerHTML = '<p class="muted">No posts yet.</p>';
      return;
    }
    list.innerHTML = state.posts.map(function (p) {
      var canVote = state.hasPass === true && state.account;
      return '<article class="post" data-id="' + p.id + '">' +
        '<div class="post-meta"><span class="post-author">' + shortAddr(p.author) + '</span>' +
        '<span class="post-time">' + timeAgo(p.timestamp) + '</span></div>' +
        '<p class="post-message">' + esc(p.message) + '</p>' +
        '<button class="upvote-btn" data-id="' + p.id + '"' + (canVote ? "" : " disabled") +
        ' title="' + (canVote ? "Upvote" : "Only AgentPass holders can upvote") + '">▲ ' +
        p.upvotes + ' upvote' + (p.upvotes === 1 ? "" : "s") + '</button></article>';
    }).join("");
    list.querySelectorAll(".upvote-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        upvotePost(Number(btn.getAttribute("data-id")));
      });
    });
  }

  // ---------- transactions ----------
  function friendlyTxError(err) {
    var msg = (err && err.message) || String(err);
    if (/user rejected|user denied|denied transaction/i.test(msg)) {
      return "Transaction cancelled in your wallet — nothing was sent.";
    }
    if (/insufficient funds/i.test(msg)) {
      return "Not enough native token in your wallet to pay network gas.";
    }
    return "Transaction failed: " + msg;
  }

  function sendTx(to, data, statusEl) {
    return window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from: state.account, to: to, data: data }],
    }).then(function (txHash) {
      statusEl.innerHTML = 'Transaction sent — waiting for confirmation…<br>' +
        '<a href="' + CONFIG.BLOCK_EXPLORER + "/tx/" + txHash + '" target="_blank" rel="noopener">View on BscScan ↗</a>';
      return waitForReceipt(txHash).then(function (receipt) {
        var ok = receipt.status === "0x1" || receipt.status === 1;
        if (!ok) throw new Error("Transaction was reverted on-chain.");
        statusEl.innerHTML = 'Confirmed ✓<br>' +
          '<a href="' + CONFIG.BLOCK_EXPLORER + "/tx/" + txHash + '" target="_blank" rel="noopener">View on BscScan ↗</a>';
        return receipt;
      });
    });
  }

  function mintPass() {
    if (!contractsDeployed || state.isAgent !== true || state.hasPass === true) return;
    var btn = $("mint-btn");
    var statusEl = $("mint-status");
    btn.disabled = true;
    statusEl.textContent = "Confirm the transaction in your wallet…";
    sendTx(CONFIG.AGENT_PASS_ADDRESS, calldata(SELECTORS["mint()"]), statusEl)
      .then(function () { return refreshStatus(); })
      .then(function () { return refreshBoard(); })
      .catch(function (err) {
        statusEl.textContent = friendlyTxError(err);
        btn.disabled = false;
      });
  }

  function submitPost() {
    if (!contractsDeployed || state.hasPass !== true) return;
    var input = $("post-input");
    var text = input.value.trim();
    if (!text) { setText("post-status", "Write something first."); return; }
    if (text.length > CONFIG.MAX_POST_LENGTH) {
      setText("post-status", "Post is too long (max " + CONFIG.MAX_POST_LENGTH + " characters).");
      return;
    }
    var btn = $("post-btn");
    var statusEl = $("post-status");
    btn.disabled = true;
    statusEl.textContent = "Confirm the transaction in your wallet…";
    var data = calldata(SELECTORS["post(string)"], encString(text));
    sendTx(CONFIG.AGENT_GATE_ADDRESS, data, statusEl)
      .then(function () {
        input.value = "";
        updateCharCount();
        return refreshBoard();
      })
      .catch(function (err) {
        statusEl.textContent = friendlyTxError(err);
      })
      .then(function () { btn.disabled = false; updateActionButtons(); });
  }

  function upvotePost(postId) {
    if (!contractsDeployed || state.hasPass !== true) return;
    var btn = document.querySelector('.upvote-btn[data-id="' + postId + '"]');
    if (btn) btn.disabled = true;
    var data = calldata(SELECTORS["upvote(uint256)"], encUint(postId));
    var statusEl = $("post-status");
    statusEl.textContent = "Confirm the upvote in your wallet…";
    sendTx(CONFIG.AGENT_GATE_ADDRESS, data, statusEl)
      .then(function () { return refreshBoard(); })
      .catch(function (err) {
        statusEl.textContent = friendlyTxError(err);
        if (btn) btn.disabled = false;
      });
  }

  // ---------- wallet ----------
  function updateActionButtons() {
    var mintBtn = $("mint-btn");
    var postInput = $("post-input");
    var postBtn = $("post-btn");
    var onChain = state.chainId === CONFIG.CHAIN_ID;

    if (!contractsDeployed) {
      mintBtn.disabled = true;
      mintBtn.title = "Contracts are deploying soon";
      postInput.disabled = true;
      postBtn.disabled = true;
      setText("mint-hint", "Minting opens once the contracts are deployed.");
      setText("post-hint", "Posting opens once the contracts are deployed.");
      return;
    }
    if (!state.account) {
      mintBtn.disabled = true;
      postInput.disabled = true;
      postBtn.disabled = true;
      setText("mint-hint", "Connect your wallet to check eligibility.");
      setText("post-hint", "Connect your wallet and mint an AgentPass to post.");
      return;
    }
    if (!onChain) {
      mintBtn.disabled = true;
      postInput.disabled = true;
      postBtn.disabled = true;
      setText("mint-hint", "Switch to BSC mainnet to continue.");
      setText("post-hint", "Switch to BSC mainnet to continue.");
      return;
    }
    if (state.isAgent === true && state.hasPass !== true) {
      mintBtn.disabled = false;
      setText("mint-hint", "Free mint — you only pay network gas.");
    } else if (state.hasPass === true) {
      mintBtn.disabled = true;
      setText("mint-hint", "You already hold an AgentPass. One pass per Agent ID.");
    } else if (state.isAgent === false) {
      mintBtn.disabled = true;
      setText("mint-hint", "AgentPass is only available to Agent ID holders.");
    } else {
      mintBtn.disabled = true;
      setText("mint-hint", "Checking eligibility…");
    }

    if (state.hasPass === true) {
      postInput.disabled = false;
      postBtn.disabled = false;
      setText("post-hint", "Share with the verified-agent board. Max " + CONFIG.MAX_POST_LENGTH + " characters.");
    } else {
      postInput.disabled = true;
      postBtn.disabled = true;
      setText("post-hint", "Only AgentPass holders can post and upvote.");
    }
    renderBoard();
  }

  function updateChainUI() {
    var warn = $("chain-warning");
    if (state.account && state.chainId !== null && state.chainId !== CONFIG.CHAIN_ID) {
      show(warn);
    } else {
      hide(warn);
    }
  }

  function switchToBSC() {
    if (!hasProvider()) return;
    window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CONFIG.CHAIN_ID_HEX }],
    }).catch(function (err) {
      if (err && err.code === 4902) {
        return window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CONFIG.CHAIN_ID_HEX,
            chainName: "BSC Mainnet",
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: ["https://bsc-dataseed.bnbchain.org"],
            blockExplorerUrls: [CONFIG.BLOCK_EXPLORER],
          }],
        });
      }
      throw err;
    }).catch(function (err) {
      setText("connect-status", friendlyTxError(err));
    });
  }

  function onAccountsChanged(accounts) {
    state.account = accounts && accounts.length > 0 ? accounts[0] : null;
    state.isAgent = null;
    state.hasPass = null;
    state.passTokenId = null;
    if (state.account) {
      setText("wallet-address", shortAddr(state.account));
      $("wallet-address").title = state.account;
      setText("connect-btn", "Connected");
      $("connect-btn").disabled = true;
      show($("status-panel"));
      setText("connect-status", "");
      refreshStatus();
    } else {
      setText("wallet-address", "Not connected");
      setText("connect-btn", "Connect Wallet");
      $("connect-btn").disabled = false;
      hide($("status-panel"));
      setText("status-agentid", "—");
      setText("status-pass", "—");
      setText("status-total", "—");
    }
    updateActionButtons();
    updateChainUI();
  }

  function onChainChanged(chainIdHex) {
    state.chainId = parseInt(chainIdHex, 16);
    setText("chain-indicator", state.chainId === CONFIG.CHAIN_ID
      ? "BSC mainnet ✓" : "Wrong network");
    updateChainUI();
    updateActionButtons();
    if (state.account && state.chainId === CONFIG.CHAIN_ID) refreshStatus();
  }

  function connectWallet() {
    if (!hasProvider()) {
      setText("connect-status",
        "No wallet detected. Install a wallet with an injected provider " +
        "(for example MetaMask), then reload this page.");
      return;
    }
    setText("connect-status", "Waiting for wallet approval…");
    window.ethereum.request({ method: "eth_requestAccounts" })
      .then(function (accounts) {
        return window.ethereum.request({ method: "eth_chainId" })
          .then(function (chainIdHex) {
            onChainChanged(chainIdHex);
            onAccountsChanged(accounts);
          });
      })
      .catch(function (err) {
        setText("connect-status", friendlyTxError(err));
      });
  }

  function updateCharCount() {
    var input = $("post-input");
    var n = input.value.length;
    setText("char-count", n + " / " + CONFIG.MAX_POST_LENGTH);
    $("char-count").className = "char-count" + (n > CONFIG.MAX_POST_LENGTH ? " over" : "");
  }

  // ---------- init ----------
  function init() {
    if (!contractsDeployed) show($("deploy-banner"));

    $("connect-btn").addEventListener("click", connectWallet);
    $("switch-chain-btn").addEventListener("click", switchToBSC);
    $("mint-btn").addEventListener("click", mintPass);
    $("post-btn").addEventListener("click", submitPost);
    $("post-input").addEventListener("input", updateCharCount);
    $("refresh-btn").addEventListener("click", function () {
      refreshStatus();
      refreshBoard();
    });
    updateCharCount();

    // Board is public: load it even without a wallet.
    refreshBoard();
    updateActionButtons();

    if (hasProvider()) {
      window.ethereum.on("accountsChanged", onAccountsChanged);
      window.ethereum.on("chainChanged", onChainChanged);
      // Silent reconnect if the wallet already authorised this site.
      window.ethereum.request({ method: "eth_accounts" })
        .then(function (accounts) {
          return window.ethereum.request({ method: "eth_chainId" })
            .then(function (chainIdHex) {
              onChainChanged(chainIdHex);
              if (accounts && accounts.length > 0) onAccountsChanged(accounts);
            });
        })
        .catch(function () { /* wallet locked / unavailable — stay disconnected */ });
    } else {
      setText("connect-status",
        "No wallet detected in this browser. The board below is still readable; " +
        "connect a wallet to mint and post.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose the encoder/decoder for Node-based tests (harmless in browser).
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { encAddress: encAddress, encUint: encUint, encString: encString,
      decUint: decUint, decBool: decBool, decAddress: decAddress, decGetPost: decGetPost };
  }
})();
