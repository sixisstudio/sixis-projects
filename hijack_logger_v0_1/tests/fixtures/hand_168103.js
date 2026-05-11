// Synthetic fixture reconstructed from recon notes (2026-05-11, hand 168103).
// Tommy played BB at PLO 0.02/0.05, table 102, seat 2. Dealt KC JC 4S 2H.
// Action: seat 5 sit-out-folds, seat 6 calls 0.05, seat 1 raises to 0.20, hero calls.
// Buffer cap was hit mid-hand so we don't have post-preflop data.
//
// Each snapshot is a synthetic gotOmaha .game object representing one
// observable state. Real captures would have many heartbeat-duplicate
// snapshots between these, but the parser dedups by content so it doesn't matter.

const baseGame = {
  // Identifiers
  gameID: 102,
  gameNo: 168103,

  // Format
  gameType: 'PL',
  gameTypeDisplayName: 'PLO',
  game: 'omaha',
  blindLevels: '$0.02 / $0.05 PLO',
  bb: 0.05,
  cardCount: 4,
  currencySign: '$',

  // Position (constant within a hand)
  dealerId: 1,
  dealer: '6',
  bbPlayer: '2',  // hero is BB
  hasStraddle: '0|0',
  isTablePaused: false,

  // Pot
  pot: 0,
  totalPot: '0',
  pots: [],
  rake: 0,

  // Seats — 5 occupied: 1, 2 (hero), 4, 5, 6
  p1name: 'U2i7JI6BoURrDg6S0PoYlhOzMgyW',
  p1pot: '2.25', p1bet: '0', p1lbet: 0, p1BetDisplay: 0,
  p1action: '', p1lastAction: '', p1status: 0, p1sitout: '0|0',
  p1card1: '', p1card2: '', p1card3: '', p1card4: '', p1card5: '',
  p1potwin: '0', p1potwinlo: '0', p1ante: 0,

  p2name: 'U2s3xzGreA734pmnXIHeaV2XOwih',  // hero
  p2pot: '5.00', p2bet: '0', p2lbet: 0, p2BetDisplay: 0,
  p2action: '', p2lastAction: '', p2status: 0, p2sitout: '0|0',
  p2card1: '', p2card2: '', p2card3: '', p2card4: '', p2card5: '',
  p2potwin: '0', p2potwinlo: '0', p2ante: 0,

  p4name: 'U35AjGcNGXZL3zy2e4cf96aEBmXv',
  p4pot: '38.15', p4bet: '0', p4lbet: 0, p4BetDisplay: 0,
  p4action: '', p4lastAction: '', p4status: 0, p4sitout: '0|0',
  p4card1: '', p4card2: '', p4card3: '', p4card4: '', p4card5: '',
  p4potwin: '0', p4potwinlo: '0', p4ante: 0,

  p5name: 'U2x4BYFTiwBFZb40Dy3FXwgoXFR0',
  p5pot: '5.24', p5bet: '0', p5lbet: 0, p5BetDisplay: 0,
  p5action: '', p5lastAction: '', p5status: 0, p5sitout: '0|0',
  p5card1: '', p5card2: '', p5card3: '', p5card4: '', p5card5: '',
  p5potwin: '0', p5potwinlo: '0', p5ante: 0,

  p6name: 'U2wMoHfEvhpxxNJ6tjWI220Tvq5z',
  p6pot: '23.76', p6bet: '0', p6lbet: 0, p6BetDisplay: 0,
  p6action: '', p6lastAction: '', p6status: 0, p6sitout: '0|0',
  p6card1: '', p6card2: '', p6card3: '', p6card4: '', p6card5: '',
  p6potwin: '0', p6potwinlo: '0', p6ante: 0,

  // Board (preflop = all facedown)
  card1: 'facedown', card2: 'facedown', card3: 'facedown',
  card4: 'facedown', card5: 'facedown',

  // Chat (provides GUID→displayName mapping)
  chatMessages: [
    { GUID: 'U2wMoHfEvhpxxNJ6tjWI220Tvq5z', displayName: 'Angrymonkey', avatar: 'a.png', messageGUID: 'm1', message: 'hi', ts: 1778489000 },
    { GUID: 'U35AjGcNGXZL3zy2e4cf96aEBmXv', displayName: 'SWA713', avatar: 'a.png', messageGUID: 'm2', message: 'gg', ts: 1778489100 },
    { GUID: 'U2s3xzGreA734pmnXIHeaV2XOwih', displayName: 'call2bluff', avatar: 'a.png', messageGUID: 'm3', message: 'hello', ts: 1778489200 },
    { GUID: 'U2i7JI6BoURrDg6S0PoYlhOzMgyW', displayName: 'ChipPimp', avatar: 'a.png', messageGUID: 'm4', message: 'nh', ts: 1778489250 },
    { GUID: 'U2x4BYFTiwBFZb40Dy3FXwgoXFR0', displayName: 'DallasDegen', avatar: 'a.png', messageGUID: 'm5', message: 'lol', ts: 1778489280 },
  ],

  // Showdown / win fields (empty until showdown)
  showdown: { currentPot: 0, currentStep: 0, handType: 'Hi' },
  winner: '', guidWinner: '',
  win1: '', win2: '', win3: '', win4: '', win5: '', win6: '', win7: '', win8: '', win9: '',
  winType1: '', winType2: '', winType3: '', winType4: '', winType5: '', winType6: '', winType7: '', winType8: '', winType9: '',
  lowin1: '', lowin2: '', lowin3: '', lowin4: '', lowin5: '', lowin6: '', lowin7: '', lowin8: '', lowin9: '',
  lowinType1: '', lowinType2: '', lowinType3: '', lowinType4: '', lowinType5: '', lowinType6: '', lowinType7: '', lowinType8: '', lowinType9: '',
  lowinner: '',
  handRank: '',
  closed: 0, closedBetting: 0,
  lastAllInPlayer: '0', lastRaisePlayer: '0',
  bustedPlayerCount: 0, finalTable: 0, levelLimit: 0,
  activePlayersCount: 5,
  highestBetPlayer: null,
};

function snap(overrides) {
  return { event: 'gotOmaha', game: { ...baseGame, ...overrides } };
}

// 8 distinct snapshots representing hand 168103's preflop action
export const hand168103Snapshots = [
  // 0: dealer button moved to seat 6
  snap({
    lastmove: 1778490183,
    hand: '2',  // seat 2 (SB by hand pointer) is up — but this is the button-assignment tick
    lastaction: 'call',
    lastbet: '0|0',
    lastplayer: '0',
    languageKey: 'GAME_MSG_DEALER_BUTTON',
    debugMSG: '242',
  }),

  // 1: SB posted (seat 1 = $0.02)
  snap({
    lastmove: 1778490186,
    hand: '3',
    lastaction: 'call',
    lastbet: '1|0.02',
    lastplayer: '1',
    languageKey: 'GAME_PLAYER_SMALL_BLIND',
    debugMSG: '221',
    p1bet: '0.02',
    p1pot: '2.23',
    pot: 0.02, totalPot: '0.02',
  }),

  // 2: BB posted (seat 2 = hero = $0.05)
  snap({
    lastmove: 1778490187,
    hand: '4',
    lastaction: 'call',
    lastbet: '2|0.05',
    lastplayer: '2',
    languageKey: 'GAME_PLAYER_BIG_BLIND',
    debugMSG: '250',
    p1bet: '0.02', p1pot: '2.23',
    p2bet: '0.05', p2pot: '4.95', p2action: 'bb',
    pot: 0.07, totalPot: '0.07',
  }),

  // 3: Cards dealt (hero's cards appear in p2card slots)
  snap({
    lastmove: 1778490188,
    hand: '5',
    lastaction: 'call',
    lastbet: '2|0.05',
    lastplayer: '2',
    languageKey: 'GAME_MSG_DEAL_CARDS',
    debugMSG: '1402',
    p1bet: '0.02', p1pot: '2.23',
    p2bet: '0.05', p2pot: '4.95', p2action: 'bb',
    p2card1: 'KC', p2card2: 'JC', p2card3: '4S', p2card4: '2H',
    // Other seats: cards = 'facedown' to indicate they were dealt cards (just not visible to spectator)
    // BUT: hero's view doesn't have villain cards either, so leave as ''
    pot: 0.07, totalPot: '0.07',
  }),

  // 4: seat 5 sit-out folds
  snap({
    lastmove: 1778490191,
    hand: '6',
    lastaction: 'call',  // last "decision-action" was the BB call
    lastbet: '2|0.05',
    lastplayer: '5',
    languageKey: 'GAME_PLAYER_FOLDS',
    debugMSG: '1982-sitOut_fold-5-5',
    p1bet: '0.02', p1pot: '2.23',
    p2bet: '0.05', p2pot: '4.95', p2action: 'bb',
    p2card1: 'KC', p2card2: 'JC', p2card3: '4S', p2card4: '2H',
    p5action: 'fold', p5lastAction: 'fold',
    pot: 0.07, totalPot: '0.07',
  }),

  // 5: seat 6 calls
  snap({
    lastmove: 1778490208,
    hand: '1',  // action moves to seat 1
    lastaction: 'call',
    lastbet: '6|0.05',
    lastplayer: '6',
    languageKey: 'GAME_PLAYER_CALLS',
    debugMSG: '893-1023playeraction-call-6-5-1778490207',
    p1bet: '0.02', p1pot: '2.23',
    p2bet: '0.05', p2pot: '4.95', p2action: 'bb',
    p2card1: 'KC', p2card2: 'JC', p2card3: '4S', p2card4: '2H',
    p5action: 'fold', p5lastAction: 'fold',
    p6bet: '0.05', p6pot: '23.71', p6lastAction: 'call',
    pot: 0.12, totalPot: '0.12',
  }),

  // 6: seat 1 raises to 0.20
  snap({
    lastmove: 1778490215,
    hand: '2',  // action returns to hero
    lastaction: 'raise',
    lastbet: '1|0.20',
    lastplayer: '1',
    languageKey: 'GAME_PLAYER_RAISES',
    debugMSG: '893-1023playeraction-raise-1-5-1778490214',
    p1bet: '0.20', p1pot: '2.05', p1lastAction: 'raise',
    p2bet: '0.05', p2pot: '4.95',
    p2card1: 'KC', p2card2: 'JC', p2card3: '4S', p2card4: '2H',
    p5action: 'fold', p5lastAction: 'fold',
    p6bet: '0.05', p6pot: '23.71', p6lastAction: 'call',
    pot: 0.30, totalPot: '0.30',
  }),

  // 7: hero (seat 2) calls
  snap({
    lastmove: 1778490220,
    hand: '6',  // back to seat 6
    lastaction: 'call',
    lastbet: '2|0.20',
    lastplayer: '2',
    languageKey: 'GAME_PLAYER_CALLS',
    debugMSG: '893-1023playeraction-call-2-5-1778490219',
    p1bet: '0.20', p1pot: '2.05', p1lastAction: 'raise',
    p2bet: '0.20', p2pot: '4.80', p2action: 'call', p2lastAction: 'call',
    p2card1: 'KC', p2card2: 'JC', p2card3: '4S', p2card4: '2H',
    p5action: 'fold', p5lastAction: 'fold',
    p6bet: '0.05', p6pot: '23.71', p6lastAction: 'call',
    pot: 0.45, totalPot: '0.45',
  }),
];

// Hand 168104 (synthetic next hand to test boundary detection — fold-around)
export const hand168104Snapshots = [
  snap({
    gameNo: 168104,
    lastmove: 1778490300,
    hand: '1',
    languageKey: 'GAME_MSG_DEALER_BUTTON',
    dealer: '1',
    debugMSG: '300',
  }),
];
