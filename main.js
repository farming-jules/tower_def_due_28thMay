// CONSTANTS
const FPS = 60
const LOOP_INTERVAL = Math.round(1000 / FPS)

let GAME_WIDTH
let GAME_HEIGHT

const PLAYER_HEALTH = 3
const PLAYER_MONEY = 100

const SOLDIER_CD = 1000
const SOLDIER_WIDTH = 50
const SOLDIER_HEIGHT = 50
const SOLDIER_HP = 100


const TOWER_WIDTH = 70
const TOWER_HEIGHT = 70
const TOWER_TYPES = [1, 2, 3] // define the types of towers available (btn-tower-1, btn-tower-2, btn-tower-3)
const TOWERS_CD = [500, 700, 1000 ]
const TOWERS_DP = [10, 25, 50]
const TOWERS_RADIUS = [100, 125, 150]
const TOWERS_MONEY = [20, 50, 100]

const BASE_VELOCITY = 1.8
const ROUND_SETTINGS = [3, 5, 7, 10]

// Elements
const $startBtn = $("#start-btn")
const $welcomeBox = $("#welcome-box")
const $gameBox = $("#game-box")
const $gameOverBox = $("#game-over-box")
const $gameBody = $("#game-body")
const $towerChoices = $('.tower-choice')
const $mems = $(".mem")
const $enemyPath = $('#enemy-path')
const $pauseBtn = $('#pause-btn')
const $playBtn = $("#play-btn")
const $showRound = $("#show-round")
const $nextRoundEnemy = $("#next-round-number")
const $resetBtns = $(".reset-btn")
const $winnerBox = $("#winner-box")
const $healths = $('#health')
const $moneyText = $('#money span')

// Shared Global Variable
let gameLoop // Game Loop = generate enemies each round
let selectedTowerType // define the default tower type
let prevSoldierGenTime // define the previous soldier generation time
let chanceLeft
let money
let round
let soldiersSpawnCounter = 0
let removedCounter
let toBeRemovedSoldiers
let towers // in case we have multiple towers generated
let soldiers // in case we have multiple soldiers generated

function handleReset() {
  gameLoop = null
  selectedTowerType = null
  prevSoldierGenTime = null
  chanceLeft = PLAYER_HEALTH
  money = PLAYER_MONEY
  round = 1
  soldiersSpawnCounter = 0
  removedCounter = 0
  toBeRemovedSoldiers = []
  towers = []
  soldiers = []
  
  $showRound.html(`Round: ${round}`)
  $nextRoundEnemy.html(`Enemies: ${ROUND_SETTINGS[round - 1]}`)
  $healths.find('> *').show()
  $moneyText.text(money)
  $mems.empty()
  $('.enemy').remove()

  $winnerBox.hide()
  $gameOverBox.hide()
  $gameBox.show()
}

//////////////////////////////////////////////////////////////////////

function spawnEnemy() {
  if (soldiersSpawnCounter < ROUND_SETTINGS[round - 1]) {
    const currTime = new Date().getTime()
    const timeDiff = currTime - (prevSoldierGenTime || 0)

    if (timeDiff >= SOLDIER_CD) {
      const newSoldier = {
        $elem: $('<div class="enemy">100</div>'),
        position: {
          x: (GAME_WIDTH / 2) - (SOLDIER_WIDTH / 2),
          y: 0
        },
        centerPoint: {
          x: (GAME_WIDTH / 2),
          y: (SOLDIER_WIDTH / 2)
        },
        healthPoint: SOLDIER_HP
      }

      newSoldier.$elem.appendTo($enemyPath).css({
        top: `${newSoldier.position.y}px`,
        left: `${newSoldier.position.x}px`
      })

      soldiers.push(newSoldier)
      prevSoldierGenTime = currTime
      soldiersSpawnCounter++
    }
  }
}

function reducePlayerHealth() {
  // if soldier reaches end point , minus player health
    chanceLeft--
    if (chanceLeft === 0){
      handlePause()
      $gameBox.hide()
      $gameOverBox.show()
    }
  }

function updateEnemyMovement() {
  // Everytime this gets invoked, update enemy position
  soldiers.forEach(function (soldier) {
    const {
      $elem,
      position: {
        y
      }
    } = soldier
    const newY = y + (BASE_VELOCITY * (round * 1.1))
    $elem.css('top', newY)
    soldier.position.y = newY
    soldier.centerPoint.y = newY + (SOLDIER_WIDTH / 2)

    // console.log(newY + SOLDIER_HEIGHT, GAME_HEIGHT)
    if (newY + SOLDIER_HEIGHT >= GAME_HEIGHT) {
      toBeRemovedSoldiers.push(soldier)
      reducePlayerHealth()
      $healths.find('> *:visible').eq(0).hide()
    }
  })
}

function continuousAttack(tower, soldier) {
  const { prevShot, dp, cd } = tower
  const { healthPoint } = soldier

  const currTime = new Date().getTime()
  const timeDiff = currTime - (prevShot || 0)
  
  if (timeDiff >= cd) {
    console.log(soldier.healthPoint)
    soldier.healthPoint = healthPoint - dp
    soldier.$elem.text(soldier.healthPoint)
    tower.prevShot = currTime
  }
  if (soldier.healthPoint <= 0) {
    changeMoney(20)
    toBeRemovedSoldiers.push(soldier)
  }
}

function isInRange() {
  towers.forEach(function (tower) {
    const {
      centerPoint: tCenterPoint
    } = tower

    for (let i = 0; i < soldiers.length; i++) {
      const {
        centerPoint: sCenterPoint
      } = soldiers[i]
  
      let dx = tCenterPoint.x - sCenterPoint.x;
      let dy = tCenterPoint.y - sCenterPoint.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
  
      if (distance < tower.radius + (SOLDIER_WIDTH / 2)) {
        continuousAttack(tower, soldiers[i])
        break
      }
    }
  })
}

function removeEnemy() {
  toBeRemovedSoldiers.forEach(function (tbrSoldier, i) {
    const index = soldiers.findIndex(function (soldier) {
      return soldier.$elem[0] === tbrSoldier.$elem[0]
    })

    if (index >= 0) {
      tbrSoldier.$elem.remove()
      soldiers.splice(index, 1)
      removedCounter++
    }
  })

  toBeRemovedSoldiers = []
}

function checkRoundCompleted() {
  if (removedCounter === ROUND_SETTINGS[round - 1]) {
    soldiersSpawnCounter = 0
    removedCounter = 0
    round++
    handlePause()

    if (round <= ROUND_SETTINGS.length) {
      $showRound.html(`Round: ${round}`)
      $nextRoundEnemy.html(`Enemies: ${ROUND_SETTINGS[round - 1]}`)
    }
  }
  
  if (round > ROUND_SETTINGS.length) { //win
    handlePause()
    $gameBox.hide()
    $winnerBox.show()
  }
}

function handleUpdate() {
  spawnEnemy()
  updateEnemyMovement()
  isInRange()
  removeEnemy()
  checkRoundCompleted()
}

function handleStart() {
  // hide and show components
  $welcomeBox.hide()
  $gameBox.show()
}

function handlePlay() {
  gameLoop = setInterval(handleUpdate, LOOP_INTERVAL)
  $playBtn.attr('disabled', true)
  $pauseBtn.attr('disabled', false)
}

function handlePause() {
  clearInterval(gameLoop)
  gameLoop = null
  $playBtn.attr('disabled', false)
  $pauseBtn.attr('disabled', true)
}

function handleTowerChoice(e) {
  const $elem = $(e.target)
  const type = $elem.data("type")
  selectedTowerType = TOWER_TYPES[type]

  $towerChoices.addClass('btn-secondary').removeClass('btn-success')
  $elem.removeClass('btn-secondary').addClass('btn-success')
}

function changeMoney(amount) {
  money += amount
  $moneyText.text(money)
}

function canBuild() {
  if ( money < TOWERS_MONEY[selectedTowerType - 1] ){
    alert("Not enough money")
    return false
  } else {
    return true
  }
}

function handleMemClick(e) {
  const $selectedMem = $(e.target)
  const $memTowerType = $selectedMem.find('span')
  const existingTowerType = $memTowerType[0] ? Number($memTowerType.text()) : null

  if (!selectedTowerType) {
    alert("select tower type first!")
  } else if (existingTowerType !== null && selectedTowerType > existingTowerType && canBuild()) {
    existingTower = towers.find((tower) => {
      return $selectedMem[0] === tower.$elem[0]
    })
    
    changeMoney(-TOWERS_MONEY[selectedTowerType - 1])
    
    existingTower = {
      ...existingTower,
      radius: TOWERS_RADIUS[selectedTowerType - 1],
      dp: TOWERS_DP[selectedTowerType - 1],
      cd: TOWERS_CD[selectedTowerType - 1]
    }

    $memTowerType.text(selectedTowerType)
    existingTower.$elem.find('.range').css({
      width: TOWERS_RADIUS[selectedTowerType - 1] * 2,
      height: TOWERS_RADIUS[selectedTowerType - 1] * 2
    })
  } else if (existingTowerType === null && canBuild()) {
    const $elem = $(e.target)
    const position = $elem.position()

    changeMoney(-TOWERS_MONEY[selectedTowerType - 1])

    const newTower = {
      $elem,
      type: selectedTowerType,
      radius: TOWERS_RADIUS[selectedTowerType - 1],
      dp: TOWERS_DP[selectedTowerType - 1],
      cd: TOWERS_CD[selectedTowerType - 1],
      prevShot: null,
      centerPoint: {
        x: position.left + (TOWER_WIDTH / 2),
        y: position.top + (TOWER_HEIGHT / 2),
      }
    }

    $elem.html(`
      <div>Tower <span>${selectedTowerType}</span></div>
      <div class="range""></div>
    `)

    $elem.find('.range').css({
      width: TOWERS_RADIUS[selectedTowerType - 1] * 2,
      height: TOWERS_RADIUS[selectedTowerType - 1] * 2
    })

    towers.push(newTower)
  } 
}

function init() {
  handleReset()

  GAME_WIDTH = $gameBody.width()
  GAME_HEIGHT = $gameBody.height()

  // register a onclick listen to the start button, so that,
  // when start button was pressed, hide() and show() UI components
  $startBtn.on('click', handleStart)

  $playBtn.on('click', handlePlay)
  $pauseBtn.on('click', handlePause)

  // update selectedTowerType variable
  $towerChoices.on('click', handleTowerChoice)

  // update the text when the mem is clicked
  $mems.on('click', handleMemClick)

  //reset the whole game to initial values
  $resetBtns.on('click', handleReset)
}

init()