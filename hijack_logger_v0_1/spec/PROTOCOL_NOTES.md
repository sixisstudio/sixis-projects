# Hijack Poker WebSocket Protocol Notes

**Source:** Phase 0 recon, 2026-05-11. Driven via in-page WS proxy installed through Claude-in-Chrome MCP, captured on logged-in `quangholio@gmail.com` account at table 102 (PLO $0.02/$0.05). Spectator mode + one seated hand.

**Recon depth:** ~5000 frames captured, decoded, dedup'd. Two distinct WS channels enumerated. One hand fully reconstructed end-to-end.

This document is the parser's reference. If Hijack ships a client update, validate this doc against fresh captures first.

---

## 1. Two channels

### 1.1 Game channel: `wss://game-ws.hijackpoker.com/?token=<JWT>`

The authenticated per-user game stream. Carries all game state for tables the user is currently subscribed to. **This is the only channel the parser needs.**

- Auth: JWT in URL query string. Decodes to a Descope-style token with `sub` (user GUID), `displayname`, `email`, `phone`, `firstname`, `lastname`, `iat`, `exp`, `rexp` (refresh exp).
- Encoding: plain text JSON frames. No compression, no encryption.
- Heartbeat: client sends `{"action":"ping"}` periodically; server replies `{"event":"pong","playerGUID":"..."}`.
- Subscription: client sends `{"action":"SubscribeToGameUpdates","gameID":"102","game":"omaha","username":"<GUID>","socketId":"<sid>","playerGUID":"<GUID>","deviceId":null}` when joining a table.

**Inbound events observed:**
- `gotOmaha` — the big one. Full table state. See §2.
- `pong` — heartbeat response.
- `gotServerDetails` — server metadata.
- `got_liveChatNotification` — `{event:"got_liveChatNotification", data:[{gameID, unreadMessageCount}, ...]}`.
- `got_playerMoney` — fires when sitting down, account balance update.
- `got_playerPromos` — promo notifications.

**Outbound actions observed:**
- `ping` — heartbeat.
- `SubscribeToGameUpdates` — table join.

**Other game variants:** the event name appears to be game-type-specific. Observed `gotOmaha` for PLO. NLHE presumably emits `gotHoldem` or similar (untested). The Layer B parser keys on the `event` field — if a non-Omaha variant is seen, it should refuse to parse and log a `[wrong-variant]` warning.

### 1.2 Engine channel: `wss://engine.hijack.poker/socket.io/?EIO=4&transport=websocket`

socket.io v4 engine carrying lobby/tournament/maintenance metadata. **The parser does NOT need this channel for hand reconstruction.** Capture for completeness; ignore for HH output.

- Encoding: socket.io v4 text framing (`42["eventName","<payload>"]`). Payloads are gzip-base64 (gzip magic `1f 8b` base64-encoded as `H4sI...`). Decompress with `DecompressionStream('gzip')`.
- Heartbeat: engine.io control packets `2` (ping) and `3` (pong) sent as plain text.

**Inbound events observed:**
- `gotMaintenanceSchedule`, `gotPlayerTournamentDetails`, `gotServerDetails`, `gotTournamentH5`, `lobby:v1:read:response`.

Layer B can ignore all of these in v1.

---

## 2. `gotOmaha` event shape

The 21KB state push. ~415 keys in `.game` object. Broadcast on every action at the table. Same payload to all subscribed clients except for hero-cards filtering.

### 2.1 Top-level structure

```js
{
  event: "gotOmaha",
  game: {
    // 415 keys — see sections below
  }
}
```

### 2.2 Hand identification

- `gameID: number` — table ID. Stable per table (e.g., 102 for the table we recon'd).
- `gameNo: number` — hand number. Monotonic increment per hand on the table (e.g. 168098 → 168101 → 168103). Critical for hand boundary detection.
- `gameType: "PL"` — limit type. PL = Pot Limit.
- `gameTypeDisplayName: "PLO"` — variant display.
- `game: "omaha"` — variant key.
- `blindLevels: "$0.02 / $0.05 PLO"` — display string.
- `bb: 0.05`, `sb` implicit (= bb/2 from blindLevels), `baseAnte: 0`, `cap: 0`, `mraise: 0.05`.
- `currencySign: "$"`.
- `cardCount: 4` — number of hole cards per player (4 for PLO, 2 for NLHE).
- `clubId, isPennyTable, isVIP, finalTable, live` — table-class flags.

### 2.3 Position

- `dealerId: number` — internal dealer rotation counter.
- `dealer: string(1)` — seat ID of current button (e.g., `"6"`).
- `bbPlayer: string(1)` — seat ID with BB.
- (`sb` seat is implicit; calculate as `(bbPlayer - 1) % maxSeats` or `dealer + 1` per standard rules.)
- `hand: string(1)` — seat ID whose turn it is to act NOW.

### 2.4 Last action (state machine input)

- `lastaction: string` — last action verb (`"call"`, `"fold"`, `"check"`, `"raise"`, `"bet"`, `"allin"`).
- `lastbet: string` — last bet info, format `"<actorSeat>|<amount>"` (e.g., `"6|0.15"`).
- `lastplayer: string(1)` — seat ID of actor.
- `lastmove: number` — epoch seconds.
- `lastAllInPlayer: string(1)` — seat ID, `"0"` if none.
- `lastRaisePlayer: string(1)` — seat ID, `"0"` if none.

### 2.5 Action enum & breadcrumb

- `languageKey: string` — canonical i18n key for the last action. **Use this as the action-type enum.** Observed:
  - `GAME_MSG_DEALER_BUTTON` — button moved
  - `GAME_PLAYER_SMALL_BLIND` — SB posted
  - `GAME_PLAYER_BIG_BLIND` — BB posted
  - `GAME_MSG_DEAL_CARDS` — hole cards dealt
  - `GAME_PLAYER_FOLDS` — fold
  - `GAME_PLAYER_CALLS` — call
  - `GAME_PLAYER_RAISES` — raise
  - `GAME_PLAYER_CHECKS` — check
  - (presumably also: `GAME_PLAYER_BETS`, `GAME_PLAYER_ALLIN`, `GAME_MSG_DEAL_FLOP`, `GAME_MSG_DEAL_TURN`, `GAME_MSG_DEAL_RIVER`, `GAME_MSG_SHOWDOWN` — verify during build)
- `debugMSG: string` — developer breadcrumb. Two observed formats:
  - Simple ID: `"242"`, `"1402"`, `"2542"` — state ID, opaque to us.
  - Action-encoded: `"893-1023playeraction-call-2-5-1778490219"` — parseable as `<state-id>-<sub-id>playeraction-<action>-<actor-seat>-<target-seat>-<epoch>`. Use as cross-check against `languageKey`.

### 2.6 Per-seat state (flat-encoded)

For each seat N (1-10), the following keys exist (most empty for unoccupied seats):

| Key | Type | Purpose |
|-----|------|---------|
| `p{N}name` | string | Player GUID (NOT displayname). Empty if seat unoccupied. |
| `p{N}pot` | string | Current stack size (e.g., `"38.43"`). Empty if unoccupied. |
| `p{N}bet` | string | Current street's committed bet (e.g., `"0.20"`). |
| `p{N}lbet` | number | Last bet rounded value. |
| `p{N}BetDisplay` | number | Display version of current bet. |
| `p{N}ante` | number | Ante posted this hand. |
| `p{N}action` | string | Current action label (e.g., `"call"`, `"bb"`, `""`). |
| `p{N}lastAction` | string | Same as above for prior tick. |
| `p{N}preAction` | null/object | Pre-selected action (check/fold/call-any). |
| `p{N}card1..p{N}card5` | string | Hole cards. `""` if unoccupied. `"facedown"` if seated but not visible (villain pre-showdown OR hero waiting blind). REAL CARD VALUES like `"KC"` for hero's seat when dealt in (and for any seat at showdown if revealed). Slot 5 is unused for PLO (`cardCount=4`). |
| `p{N}status` | number | Seat status. `0` = active in hand. `5` = sitting out / waiting blind. Other values unknown. |
| `p{N}sitout` | string | Sit-out flag, format `"current\|next"` (e.g., `"0\|0"` = playing, not sitting out). |
| `p{N}pot` (yes, name collision with stack — see disambiguation) | string | Actually CURRENT STACK SIZE, not pot contribution. Confusing naming but verified. |
| `p{N}potwin` | string | Amount won from pot this hand. |
| `p{N}potwinlo` | string | Amount won from low half (hi/lo split). |
| `p{N}chat` | string | Per-player chat slot (we ignore). |
| `p{N}data` | object/null | Player-specific data (avatar, etc.). |
| `p{N}hasAddOnChips` | bool | Tournament rebuy flag. |
| `p{N}totalBounty`, `p{N}totalHandBounty` | number | Tournament KO bounties. |

**Key disambiguation:** `p{N}pot` stores the **stack size**, not the player's pot contribution. The pot contribution is computed from `p{N}bet` plus accumulated commit. Naming is unfortunate.

**Player name resolution:** `p{N}name` is the GUID. To get the displayname, look up:
1. JWT `displayname` claim for hero's seat (compare `sub` to `p{N}name`).
2. `chatMessages[].{GUID, displayName}` array — extract pairs.
3. `c1..c20` chat-slot fields — same structure, extract pairs.
4. Fallback: `Player_<N>` if no map found.

### 2.7 Board

- `card1, card2, card3, card4, card5` — community cards.
- Values: card string `"<RANK><SUIT>"` where rank ∈ `{2,3,4,5,6,7,8,9,T,J,Q,K,A}` and suit ∈ `{H,S,D,C}` (uppercase). Or `"facedown"` if unrevealed, or `""` if unused (river slot pre-deal).
- **Street detection** from board card count:
  - 0 face-up = preflop
  - 3 face-up = flop
  - 4 face-up = turn
  - 5 face-up = river

### 2.8 Pot structure

- `pot: number` — main pot scalar.
- `totalPot: string` — display string of total across main + side pots.
- `pots: array` — full pot breakdown:
  ```js
  [{
    pot: 0.45,
    players: [5, 4, 6],
    playersV2: [{pID: 5, pBet: 0}, {pID: 4, pBet: 0}, {pID: 6, pBet: 0}],
    label: "Pot",
    fullLabel: "Main Pot",
    winners: [...]
  }, ...]
  ```
- `rake, rakeFee, rakeRate, rakeTotal` — rake (observed `0` on micro-stake PLO; may be non-zero on higher stakes — verify).
- `deadMoney: number` — uncalled / dead bets.

### 2.9 Showdown

- `winner: string` — CSV of winning seat IDs (e.g. `"6,4"` for split).
- `guidWinner: string` — GUID of primary winner.
- `win1..win9: string` — 5-card eval strings, comma-separated cards (e.g., `"8S,7S,6C,5D,4H"` = a straight). One per winner.
- `winType1..winType9: string` — winner classification (`"win"`, `"side"`, etc.).
- `lowin1..lowin9` + `lowinType1..lowinType9` + `lowinner` — same structure for low half in hi/lo games. Empty strings for hi-only PLO.
- `handRank: string` — display rank of winning hand.
- `showdown: object` — `{currentPot, currentStep, handType: "Hi"}`.

**Villain hole-card reveal at showdown:** *unverified at recon time but predicted.* When a villain shows down, their `p{V}card1..p{V}card4` slots should fill with their actual hole cards (not just the 5-card eval). Verify during Gate 6.

### 2.10 Chat (NOT captured by parser — PII)

- `chatMessages: array[20]` — recent chat. Each entry: `{GUID, displayName, avatar, messageGUID, message, ts}`. `message` is URL-encoded.
- `c1..c20: string` — JSON-encoded duplicates of chatMessages (same shape).

The parser **must strip these** from the raw sidecar before writing to disk. Privacy + irrelevant to HH.

### 2.11 Misc state flags

- `closed: number` — round closed flag.
- `closedBetting: number` — betting round complete.
- `isTablePaused: bool` — pause state.
- `hasStraddle: string` — straddle state, format `"current|next"`.
- `botsAllowed, botJoinTimer, botLastJoined` — bot stuff (ignore).
- `botJoinTimer, buyInTriggerTimer, chargeTimerDelay` — various timers.
- `activePlayersCount` — number of players active in current hand.
- `bustedPlayerCount` — tournament-only (ignore for cash).
- `highestBetPlayer: object` — `{ID, GUID, bet, lbet, betDisplay, pot, isFolded, status, seatId}` — convenient handle on the high-bet player this round.

---

## 3. State machine transitions (per `gameNo`)

```
GAME_MSG_DEALER_BUTTON   →  IDLE              (new hand starting)
GAME_PLAYER_SMALL_BLIND  →  POSTING_BLINDS    
GAME_PLAYER_BIG_BLIND    →  POSTING_BLINDS    
GAME_MSG_DEAL_CARDS      →  PREFLOP           (hero p{seat}cardN slots fill here for hero)
GAME_PLAYER_{FOLDS|CALLS|RAISES|CHECKS|BETS|ALLIN}  →  stay in current street
GAME_MSG_DEAL_FLOP       →  FLOP              (card1..3 transition from "facedown")
GAME_MSG_DEAL_TURN       →  TURN              (card4 transitions)
GAME_MSG_DEAL_RIVER      →  RIVER             (card5 transitions)
GAME_MSG_SHOWDOWN        →  SHOWDOWN          (winner/win1 populate)
(silent transition)      →  COMPLETE          (hand emit + reset, on gameNo increment)
```

---

## 4. Action timing & dedup

`gotOmaha` is broadcast on every actionable event AND on heartbeat-like ticks. Many consecutive frames carry identical state. **Dedupe by:**

```
key = (gameID, gameNo, lastmove, lastaction, lastplayer,
       card1, card2, card3, card4, card5,
       hash(p{1..10}card1..4))
```

Only emit a state-diff event when the key changes.

**`lastmove` granularity:** seconds, not milliseconds. Multiple sub-second events can share a `lastmove` value — distinguish via the rest of the key.

---

## 5. Known edge cases (to handle during Layer B build)

- **Sit-out fold**: when a player has `p{N}sitout="1|1"` and a hand starts, they auto-fold. `debugMSG` shows `"<state>-sitOut_fold-<seat>-<seat>"` instead of normal `playeraction-fold-...`. Don't double-count this as a player decision.
- **Late join**: player can sit between hands but has `p{N}status=5` until they post their next BB. They appear in seats list but not in active hands.
- **Disconnect**: a disconnected player still occupies the seat. Their `p{N}status` may transition. Hands continue without them.
- **All-in side pots**: `pots[]` array length > 1. Each side pot has its own `players`, `winners`, etc. PokerStars summary needs per-pot lines.
- **Multi-tabling**: each table is its own `gameID`. Each table has its own `gameNo` sequence. Each table has its own subscribe on the same WS connection. Parser keys all state by `gameID`.
- **Reconnect / page reload mid-session**: WS reconnects, server replays current table state via fresh `gotOmaha`. The hand-in-progress at reconnect time may be missing preflop history. Mark this as `[parser-degraded]`.
- **Hand 168102 mystery**: tonight Tommy's hands jumped from 168101 (we were spectator) to 168103 (he was dealt). Where was 168102? Possibilities: he sat exactly between hands and 168102 dealt without him as a regular hand, OR 168102 was a quick fold-around we missed in spectator mode during the buffer-cap chaos. Verify pattern in Gate 6.

---

## 6. Open questions for Gate 6 / 7

1. **Villain showdown hole cards**: do they fill in `p{V}card1..p{V}card4` or only in `win{N}` derived 5-card strings? Layer B parser must handle both.
2. **Reconnect behavior**: what's the precise frame sequence on a fresh socket open during an active hand?
3. **All-in pot resolution**: full structure of `pots[]` when 3+ players are all-in for different amounts.
4. **NLHE / PLO5 / mixed games**: event name varies. Validate parser refuses unsupported variants gracefully.
5. **Stake levels**: do higher-stake tables have different rake behavior or schema differences? Recon'd only on $0.02/$0.05 PLO.
6. **Heads-up (2-player)**: position assignment (button = SB in HU). Hand we observed was 5-handed.
