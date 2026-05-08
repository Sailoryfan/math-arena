import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getStorage, setStorage, generateId } from '@/utils/storage'

// Card definitions
export interface Card {
  id: string
  name: string
  description: string
  cost: number
  type: 'attack' | 'defense' | 'skill'
  value: number
  rarity: 'common' | 'uncommon' | 'rare'
}

export interface Relic {
  id: string
  name: string
  description: string
  effect: string
}

export interface DungeonNode {
  id: string
  type: 'battle' | 'elite' | 'chest' | 'shop' | 'rest' | 'event' | 'boss'
  row: number
  col: number
  connections: string[]
  visited: boolean
  available: boolean
}

export interface DungeonFloor {
  nodes: DungeonNode[]
  currentNodeId: string | null
}

export interface DungeonRun {
  id: string
  floor: number
  maxFloor: number
  playerHP: number
  playerMaxHP: number
  energy: number
  maxEnergy: number
  gold: number
  deck: Card[]
  hand: Card[]
  drawPile: Card[]
  discardPile: Card[]
  relics: Relic[]
  map: DungeonFloor[]
  currentNodeId: string | null
  isActive: boolean
  startedAt: string
}

// Card pool
const ALL_CARDS: Card[] = [
  { id: 'c_atk1', name: '基础攻击', description: '造成6点伤害', cost: 1, type: 'attack', value: 6, rarity: 'common' },
  { id: 'c_atk2', name: '重击', description: '造成10点伤害', cost: 2, type: 'attack', value: 10, rarity: 'common' },
  { id: 'c_atk3', name: '快斩', description: '造成4点伤害，抽1张牌', cost: 1, type: 'attack', value: 4, rarity: 'uncommon' },
  { id: 'c_atk4', name: '旋风斩', description: '对所有敌人造成5点伤害', cost: 1, type: 'attack', value: 5, rarity: 'uncommon' },
  { id: 'c_atk5', name: '致命一击', description: '造成15点伤害', cost: 3, type: 'attack', value: 15, rarity: 'rare' },
  { id: 'c_def1', name: '基础防御', description: '获得5点护甲', cost: 1, type: 'defense', value: 5, rarity: 'common' },
  { id: 'c_def2', name: '铁壁', description: '获得8点护甲', cost: 2, type: 'defense', value: 8, rarity: 'common' },
  { id: 'c_def3', name: '反击', description: '获得3点护甲，造成3点伤害', cost: 1, type: 'defense', value: 3, rarity: 'uncommon' },
  { id: 'c_def4', name: '护盾术', description: '获得12点护甲', cost: 2, type: 'defense', value: 12, rarity: 'rare' },
  { id: 'c_skl1', name: '集中', description: '抽2张牌', cost: 1, type: 'skill', value: 2, rarity: 'common' },
  { id: 'c_skl2', name: '强化', description: '本回合攻击+3', cost: 1, type: 'skill', value: 3, rarity: 'uncommon' },
  { id: 'c_skl3', name: '回复', description: '恢复5点生命', cost: 1, type: 'skill', value: 5, rarity: 'uncommon' },
  { id: 'c_skl4', name: '蓄力', description: '获得2点能量', cost: 0, type: 'skill', value: 2, rarity: 'rare' },
  { id: 'c_skl5', name: '全回复', description: '恢复15点生命', cost: 2, type: 'skill', value: 15, rarity: 'rare' },
  { id: 'c_skl6', name: '抽牌术', description: '抽3张牌', cost: 1, type: 'skill', value: 3, rarity: 'uncommon' },
]

// Relic pool
const ALL_RELICS: Relic[] = [
  { id: 'r1', name: '红宝石', description: '每场战斗开始时恢复3HP', effect: 'heal_start_3' },
  { id: 'r2', name: '能量石', description: '每回合+1能量', effect: 'energy_1' },
  { id: 'r3', name: '战斧', description: '所有攻击+2伤害', effect: 'atk_2' },
  { id: 'r4', name: '铁盾', description: '每回合开始获得3护甲', effect: 'armor_3' },
  { id: 'r5', name: '幸运币', description: '战斗胜利后+10金币', effect: 'gold_10' },
  { id: 'r6', name: '生命之叶', description: '最大HP+10', effect: 'maxhp_10' },
  { id: 'r7', name: '疾风靴', description: '每回合抽1张额外牌', effect: 'draw_1' },
  { id: 'r8', name: '烈焰戒指', description: '攻击暴击率+15%', effect: 'crit_15' },
]

const STORAGE_KEY = 'dungeon-progress'

export const useDungeonStore = defineStore('dungeon', () => {
  const currentRun = ref<DungeonRun | null>(null)
  const highestFloor = ref(getStorage('dungeon-highest', 0))
  const dailyRuns = ref(getStorage('dungeon-daily', { date: '', count: 0 }))
  const battleState = ref({
    enemyHP: 0,
    enemyMaxHP: 0,
    enemyAtk: 0,
    enemyName: '',
    playerArmor: 0,
    turn: 0,
    isPlayerTurn: true,
    isBattleOver: false,
    isVictory: false,
    log: [] as string[],
  })

  const canRun = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (dailyRuns.value.date !== today) return true
    return dailyRuns.value.count < 3
  })

  const runsRemaining = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (dailyRuns.value.date !== today) return 3
    return 3 - dailyRuns.value.count
  })

  function startRun() {
    if (!canRun.value) return false

    const today = new Date().toISOString().slice(0, 10)
    if (dailyRuns.value.date !== today) {
      dailyRuns.value = { date: today, count: 0 }
    }
    dailyRuns.value.count++
    setStorage('dungeon-daily', dailyRuns.value)

    const starterDeck: Card[] = [
      ...Array(4).fill(null).map(() => ({ ...ALL_CARDS[0]! })),  // 4x basic attack
      ...Array(4).fill(null).map(() => ({ ...ALL_CARDS[5]! })),  // 4x basic defense
      { ...ALL_CARDS[9]! },  // 1x concentrate
      { ...ALL_CARDS[2]! },  // 1x quick slash
    ]

    const run: DungeonRun = {
      id: generateId(),
      floor: 1,
      maxFloor: 0,
      playerHP: 80,
      playerMaxHP: 80,
      energy: 3,
      maxEnergy: 3,
      gold: 50,
      deck: starterDeck,
      hand: [],
      drawPile: [],
      discardPile: [],
      relics: [],
      map: generateMap(1),
      currentNodeId: null,
      isActive: true,
      startedAt: new Date().toISOString(),
    }

    currentRun.value = run
    saveRun()
    return true
  }

  function generateMap(floor: number): DungeonFloor[] {
    const floors: DungeonFloor[] = []
    const nodeTypes: DungeonNode['type'][] = ['battle', 'battle', 'elite', 'chest', 'shop', 'rest', 'event']

    for (let row = 0; row < 7; row++) {
      const nodes: DungeonNode[] = []
      const nodeCount = row === 0 ? 1 : row === 6 ? 1 : 3

      for (let col = 0; col < nodeCount; col++) {
        let type: DungeonNode['type']
        if (row === 0) type = 'battle'
        else if (row === 6) type = 'boss'
        else type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)]!

        nodes.push({
          id: `f${floor}_r${row}_c${col}`,
          type,
          row,
          col,
          connections: [],
          visited: false,
          available: row === 0,
        })
      }
      floors.push({ nodes, currentNodeId: null })
    }

    // Generate connections
    for (let row = 0; row < floors.length - 1; row++) {
      const current = floors[row]!.nodes
      const next = floors[row + 1]!.nodes
      for (const node of current) {
        const targetIdx = Math.min(node.col, next.length - 1)
        node.connections.push(next[targetIdx]!.id)
        if (targetIdx + 1 < next.length) {
          node.connections.push(next[targetIdx + 1]!.id)
        }
      }
    }

    return floors
  }

  function selectNode(nodeId: string) {
    if (!currentRun.value) return
    const floor = currentRun.value.map[0]
    if (!floor) return
    const node = floor.nodes.find(n => n.id === nodeId)
    if (!node || !node.available) return

    node.visited = true
    floor.currentNodeId = nodeId
    currentRun.value.currentNodeId = nodeId

    // Make connected nodes available
    for (const connId of node.connections) {
      const connNode = floor.nodes.find(n => n.id === connId)
      if (connNode) connNode.available = true
    }

    // Make all other nodes unavailable
    for (const n of floor.nodes) {
      if (!n.visited && !node.connections.includes(n.id)) {
        n.available = false
      }
    }

    saveRun()
  }

  function startBattle(enemyHP: number, enemyAtk: number, enemyName: string) {
    if (!currentRun.value) return

    battleState.value = {
      enemyHP,
      enemyMaxHP: enemyHP,
      enemyAtk,
      enemyName,
      playerArmor: 0,
      turn: 1,
      isPlayerTurn: true,
      isBattleOver: false,
      isVictory: false,
      log: [`遭遇 ${enemyName}！`],
    }

    // Draw hand
    currentRun.value.drawPile = [...currentRun.value.deck].sort(() => Math.random() - 0.5)
    currentRun.value.hand = []
    currentRun.value.discardPile = []
    drawCards(5)
  }

  function drawCards(count: number) {
    if (!currentRun.value) return
    for (let i = 0; i < count; i++) {
      if (currentRun.value.drawPile.length === 0) {
        currentRun.value.drawPile = [...currentRun.value.discardPile].sort(() => Math.random() - 0.5)
        currentRun.value.discardPile = []
      }
      if (currentRun.value.drawPile.length > 0) {
        currentRun.value.hand.push(currentRun.value.drawPile.pop()!)
      }
    }
  }

  function playCard(handIndex: number, correct: boolean): string {
    if (!currentRun.value) return ''
    const card = currentRun.value.hand[handIndex]
    if (!card) return ''
    if (currentRun.value.energy < card.cost) return '能量不足！'

    currentRun.value.energy -= card.cost
    let effectDesc = ''

    const multiplier = correct ? 1 : 0.5

    if (card.type === 'attack') {
      const damage = Math.round(card.value * multiplier)
      battleState.value.enemyHP -= damage
      effectDesc = `使用${card.name}，造成${damage}点伤害`
    } else if (card.type === 'defense') {
      const armor = Math.round(card.value * multiplier)
      battleState.value.playerArmor += armor
      effectDesc = `使用${card.name}，获得${armor}点护甲`
    } else if (card.type === 'skill') {
      if (card.id === 'c_skl1' || card.id === 'c_skl6') {
        const drawCount = Math.round(card.value * multiplier)
        drawCards(drawCount)
        effectDesc = `使用${card.name}，抽${drawCount}张牌`
      } else if (card.id === 'c_skl3' || card.id === 'c_skl5') {
        const heal = Math.round(card.value * multiplier)
        currentRun.value.playerHP = Math.min(currentRun.value.playerHP + heal, currentRun.value.playerMaxHP)
        effectDesc = `使用${card.name}，恢复${heal}HP`
      } else if (card.id === 'c_skl4') {
        const gain = Math.round(card.value * multiplier)
        currentRun.value.energy += gain
        effectDesc = `使用${card.name}，获得${gain}能量`
      } else {
        effectDesc = `使用${card.name}`
      }
    }

    // Remove from hand, add to discard
    currentRun.value.hand.splice(handIndex, 1)
    currentRun.value.discardPile.push(card)
    battleState.value.log.push(effectDesc)

    // Check battle end
    if (battleState.value.enemyHP <= 0) {
      battleState.value.isBattleOver = true
      battleState.value.isVictory = true
      battleState.value.log.push('战斗胜利！')
    }

    return effectDesc
  }

  function endPlayerTurn() {
    if (!currentRun.value) return
    battleState.value.isPlayerTurn = false

    // Enemy attacks
    const rawDmg = battleState.value.enemyAtk
    const blocked = Math.min(battleState.value.playerArmor, rawDmg)
    const actualDmg = rawDmg - blocked
    battleState.value.playerArmor -= blocked
    currentRun.value.playerHP -= actualDmg
    battleState.value.log.push(`敌人攻击：${rawDmg}伤害，${blocked}被格挡，受到${actualDmg}伤害`)

    if (currentRun.value.playerHP <= 0) {
      currentRun.value.playerHP = 0
      battleState.value.isBattleOver = true
      battleState.value.isVictory = false
      battleState.value.log.push('战斗失败...')
      endRun(false)
      return
    }

    // New turn
    battleState.value.turn++
    battleState.value.playerArmor = 0
    currentRun.value.energy = currentRun.value.maxEnergy
    battleState.value.isPlayerTurn = true

    // Discard hand and draw new
    currentRun.value.discardPile.push(...currentRun.value.hand)
    currentRun.value.hand = []
    drawCards(5)

    saveRun()
  }

  function endBattle() {
    if (!currentRun.value) return
    const goldReward = 10 + currentRun.value.floor * 5
    currentRun.value.gold += goldReward
    battleState.value.log.push(`获得${goldReward}金币`)
    saveRun()
  }

  function endRun(victory: boolean) {
    if (!currentRun.value) return
    currentRun.value.isActive = false
    if (currentRun.value.floor > highestFloor.value) {
      highestFloor.value = currentRun.value.floor
      setStorage('dungeon-highest', highestFloor.value)
    }
    saveRun()
  }

  function nextFloor() {
    if (!currentRun.value) return
    currentRun.value.floor++
    currentRun.value.map = generateMap(currentRun.value.floor)
    currentRun.value.currentNodeId = null
    saveRun()
  }

  function saveRun() {
    if (currentRun.value) {
      setStorage('dungeon-run', currentRun.value)
    }
  }

  function loadRun(): boolean {
    const saved = getStorage<DungeonRun | null>('dungeon-run', null)
    if (saved && saved.isActive) {
      currentRun.value = saved
      return true
    }
    return false
  }

  return {
    currentRun,
    highestFloor,
    dailyRuns,
    battleState,
    canRun,
    runsRemaining,
    startRun,
    selectNode,
    startBattle,
    playCard,
    endPlayerTurn,
    endBattle,
    endRun,
    nextFloor,
    loadRun,
    saveRun,
    ALL_CARDS,
    ALL_RELICS,
  }
})
