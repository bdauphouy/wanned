import Text from './Text.js'
import Collision from './Collision.js'
import mapCollisions from '../../assets/resources/mapCollisions.js'
import Baptiste from './elements/sprites/baptiste.js'
import Fabien from './elements/sprites/fabien.js'
import Thierry from './elements/sprites/thierry.js'
import Victor from './elements/sprites/victor.js'
import Arthur from './elements/sprites/arthur.js'
import HUD from './HUD.js'
import TextDialog from './TextDialog.js'
import triggerFabien from '../actions/zones/1/triggerFabien.js'
import triggerMonster from '../actions/zones/2/triggerMonster.js'
import triggerThierry from '../actions/zones/3/triggerThierry.js'
import triggerVictor from '../actions/zones/4/triggerVictor.js'
import triggerArthur from '../actions/zones/4/triggerArthur.js'
import Door from './elements/door.js'
import mapDoors from '../../assets/resources/mapDoors.js'
import Zone from './Zone.js'
import mapZones from '../../assets/resources/mapZones.js'
import MovableRock from './elements/movableRock.js'
import mapMovableRocks from '../../assets/resources/mapMovableRocks.js'
import Action from './Action.js'
import Sprite from './Sprite.js'
import DisplayedKey from './DisplayedKey.js'
import Monster from './elements/sprites/monster.js'
import handleContact from '../actions/zones/2/handleContact.js'
import mapSpikes from '../../assets/resources/mapSpikes.js'
import Spikes from './elements/spikes.js'
import BubbleMaker from './BubbleMaker.js'
import EndScreen from './EndScreen.js'
import Key from './elements/key.js'
import mapKeys from '../../assets/resources/mapKeys.js'
import keyboardKeys from '../../assets/resources/keyboardKeys.js'
import Sound from '../classes/Sound.js'

class Game {
  constructor(canvas) {
    this.canvas = canvas
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.ctx = this.canvas.getContext('2d')
    this.map = null
    this.bubbles = null
    this.endScreen = null
    this.mapZoom = 3
    this.mapWidth = 700
    this.mapHeight = 400
    this.mapSpeed = 5
    this.speedMeasure = 10
    this.fps = 0
    this.frame = 0
    this.capFps = 120
    this.soundVolume = 0.3
    this.mapCollisions = []
    this.mapDoors = []
    this.mapKeys = []
    this.movableRocks = []
    this.spikes = []
    this.keys = keyboardKeys
    this.startTime = Date.now()
    this.ambianceSound = new Sound(
      '../../assets/audios/ambiance.mp3',
      this.soundVolume / 3
    )
    this.fightSound = new Sound(
      '../../assets/audios/fight.mp3',
      this.soundVolume / 3
    )
    this.rockSound = new Sound('../../assets/audios/rock.mp3', this.soundVolume)
    this.hasCollisions = true
    this.movementsEnabled = true
    this.thierryTriggered = false
    this.bubblesTriggered = false
    this.baptisteHud = new HUD(
      '../../assets/images/hud/baptiste-head.png',
      3,
      10,
      document.querySelector('#wanned')
    )
    this.dialogBox = new TextDialog()
    this._elements = null
    this._lastZone = null
    this._zoneTriggerings = []
  }

  triggerGameOver() {
    if (this.endScreen === null) {
      this.endScreen = new EndScreen('Game Over')
      // TODO : create stop movements method
    }
  }

  makeBubbles() {
    this.bubbles = new BubbleMaker(this)

    return this.bubbles
  }

  get elements() {
    return [
      ...this.mapDoors,
      ...this.movableRocks,
      ...this.spikes,
      ...this.mapKeys,
      ...this._elements.sort((a, b) => a.y - b.y),
    ]
  }

  init() {
    this.displayKeys()
    this.map = new Image()
    this.map.src = '../../assets/images/map.png'
    this.fpsCounter = new Text(this.fps, 'Museo', 16, 'white', 30, 30)
    this._elements = [
      new Fabien(this),
      new Baptiste(this),
      new Monster(this),
      new Thierry(this),
      new Victor(this),
      new Arthur(this),
    ]

    this.map.addEventListener('load', () => {
      this.ctx.drawImage(this.map, 0, 0)
      this.makeDoors()
      this.makeCollisions()
      this.makeZoneTriggerings()
      this.makeMovableRocks()
      this.makeSpikes()
      this.makeKeys()

      setInterval(() => {
        this.render()
      }, 1000 / this.capFps)
    })

    window.addEventListener('keydown', (e) => {
      const key = document.querySelector(`[data-key="${e.key}"]`)

      key?.classList.add('active')

      if (e.key === this.fullScreenKey.key) {
        document.body.requestFullscreen()
      }

      this.keys.map((k) => {
        if (k.key === e.key) {
          this.findKey(e.key, 'key').pressed = true
        }
      })
    })

    window.addEventListener('keyup', (e) => {
      const key = document.querySelector(`[data-key="${e.key}"]`)

      key?.classList.remove('active')

      this.keys.map((k) => {
        if (k.key === e.key) {
          this.findKey(e.key, 'key').pressed = false
        }
      })
    })

    setInterval(() => {
      const lastZone = this._lastZone
      const currentZone = this.currentZone(this.mainCharacter)
      this._lastZone = currentZone

      if (currentZone && currentZone !== lastZone) {
        currentZone.action.trigger()
      }
    }, 100)

    this.ambianceSound.play()
  }

  currentZone(element) {
    return this.zoneTriggerings.find((zoneTriggering) => {
      return this.checkInZone(
        element.position.x,
        element.position.y,
        element.width,
        element.height,
        zoneTriggering.zones
      )
    })
  }

  get collisions() {
    if (this.mapCollisions) {
      return [
        ...this.mapCollisions,
        ...this.elements.map((element) => element.collisions).flat(),
      ].filter((collision) => collision)
    } else {
      return []
    }
  }

  makeCollisions() {
    this.mapCollisions = Collision.makeCollisions(
      mapCollisions,
      16,
      this.map.width,
      this.map.height,
      this.mapWidth,
      this.mapHeight,
      this.mapZoom
    )
  }

  makeDoors() {
    this.mapDoors = Door.makeDoors(
      this,
      mapDoors,
      16,
      this.map.width,
      this.map.height,
      this.mapWidth,
      this.mapHeight,
      this.mapZoom,
      (i) => `door${i}`
    )
  }

  makeZoneTriggerings() {
    const zones = Zone.makeZones(
      mapZones,
      16,
      this.map.width,
      this.map.height,
      this.mapWidth,
      this.mapHeight,
      this.mapZoom
    )

    this._zoneTriggerings = [
      {
        zones: zones.filter((zone) => zone.id === '01'),
        action: triggerFabien(this),
      },
      {
        zones: zones.filter((zone) => zone.id === '02'),
        action: triggerMonster(this),
      },
      {
        zones: zones.filter((zone) => zone.id === '03'),
        action: triggerThierry(this),
      },
      {
        zones: zones.filter((zone) => zone.id === '04'),
        action: triggerVictor(this),
      },
      {
        zones: zones.filter((zone) => zone.id === '05'),
        action: triggerArthur(this),
      },
    ]
  }

  makeMovableRocks() {
    this.movableRocks = MovableRock.makeMovableRocks(
      this,
      mapMovableRocks,
      16,
      this.map.width,
      this.map.height,
      this.mapWidth,
      this.mapHeight,
      this.mapZoom,
      (i) => `movableRock${i}`
    )
  }

  makeSpikes() {
    this.spikes = Spikes.makeSpikes(
      this,
      mapSpikes,
      16,
      this.map.width,
      this.map.height,
      this.mapWidth,
      this.mapHeight,
      this.mapZoom,
      (i) => `spike${i}`
    )
  }

  makeKeys() {
    this.mapKeys = Key.makeKeys(
      this,
      mapKeys,
      16,
      this.map.width,
      this.map.height,
      this.mapWidth,
      this.mapHeight,
      this.mapZoom,
      (i) => `key${i}`
    )
  }

  updateCanvas() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.makeCollisions()
  }

  findSprite(name) {
    return this.elements.find((element) => element.name === name)
  }

  get baptiste() {
    return this.findSprite('baptiste')
  }

  get fabien() {
    return this.findSprite('fabien')
  }

  get thierry() {
    return this.findSprite('thierry')
  }

  get victor() {
    return this.findSprite('victor')
  }

  get arthur() {
    return this.findSprite('arthur')
  }

  get door1() {
    return this.findSprite('door01')
  }

  get door2() {
    return this.findSprite('door02')
  }

  get door3() {
    return this.findSprite('door03')
  }

  get door4() {
    return this.findSprite('door04')
  }

  get upKey() {
    return this.findKey('Avancer', 'action')
  }

  get downKey() {
    return this.findKey('Reculer', 'action')
  }

  get leftKey() {
    return this.findKey('Aller à gauche', 'action')
  }

  get rightKey() {
    return this.findKey('Aller à droite', 'action')
  }

  get hitKey() {
    return this.findKey('Frapper', 'action')
  }

  get fullScreenKey() {
    return this.findKey('Mode plein écran', 'action')
  }

  get runKey() {
    return this.findKey('Courrir', 'action')
  }

  get mainCharacter() {
    return this.baptiste
  }

  get monster() {
    return this.findSprite('monster')
  }

  get zoneTriggerings() {
    const activeMovableRocksZones = this.movableRocks
      .map((rock) =>
        rock.movableZones
          .filter((zone) => {
            const zonePosition = zone.id.split('-')[1]

            return (
              (this.upKey.pressed && zonePosition === 'bottom') ||
              (this.downKey.pressed && zonePosition === 'top') ||
              (this.rightKey.pressed && zonePosition === 'left') ||
              (this.leftKey.pressed && zonePosition === 'right')
            )
          })
          .map((zone) => ({ zone, rock }))
      )
      .flat()

    const activeSpikesZones = this.spikes
      .filter((spike) => spike.state === 'open')
      .map((spikes) => ({ zone: spikes.spikesZones, spikes }))

    return [
      ...this._zoneTriggerings,
      ...activeMovableRocksZones
        .map(({ zone, rock }) => ({
          zones: [zone],
          action: new Action(() => {
            const zonePosition = zone.id.split('-')[1]
            const speed = this.mainCharacter.speed / 2
            this.rockSound.play()

            if (zonePosition === 'bottom' && this.upKey.pressed) {
              this.move(rock, { y: -speed }, speed)
            } else if (zonePosition === 'top' && this.downKey.pressed) {
              this.move(rock, { y: speed }, speed)
            } else if (zonePosition === 'left' && this.rightKey.pressed) {
              this.move(rock, { x: speed }, speed)
            } else if (zonePosition === 'right' && this.leftKey.pressed) {
              this.move(rock, { x: -speed }, speed)
            }
          }),
        }))
        .flat(),
      ...activeSpikesZones.map(({ spikes, zone }) => ({
        zones: zone,
        action: spikes.action,
      })),
      {
        zones: [this.monster.zone],
        action: handleContact(this),
      },
      ...this.mapKeys
        .map((key) => ({
          zones: key.zone,
          action: new Action(() => {
            new Sound('../../assets/audios/key.mp3', this.soundVolume).play()

            this.mapKeys = this.mapKeys.filter((mapKey) => mapKey !== key)
            this.mainCharacter.inventory.push(key)
          }),
        }))
        .flat(),
    ]
  }

  findKey(key, type) {
    return this.keys.find((k) => k[type] === key)
  }

  checkCollisions(element) {
    if (!this.hasCollisions) return false

    return this.collisions
      .filter(
        (collision) =>
          collision.parent === null || element.id !== collision.parent?.id
      )
      .some((collision) =>
        collision.collide(
          element.position.x,
          element.position.y,
          element.width,
          element.height,
          element instanceof Sprite
        )
      )
  }

  checkInZone(elementX, elementY, elementWidth, elementHeight, zones) {
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i]

      if (
        elementX + elementWidth >= zone.x &&
        elementX <= zone.x + zone.width &&
        elementY + elementHeight >= zone.y &&
        elementY <= zone.y + zone.height
      ) {
        return true
      }
    }
    return false
  }

  enableMovements() {
    this.movementsEnabled = true
  }

  disableMovements() {
    this.movementsEnabled = false
  }

  move(element, movement, speed = element.speed) {
    if (element !== this.mainCharacter || this.movementsEnabled) {
      const { x, y } = element.position

      if (movement.x) {
        if (movement.x < 0) {
          element.position.x -= speed
        } else {
          element.position.x += speed
        }
      }

      if (movement.y) {
        if (movement.y < 0) {
          element.position.y -= speed
        } else {
          element.position.y += speed
        }
      }

      if (element.animate) {
        if (this.mainCharacter.isWalking) {
          this.mainCharacter.walkingSound.play()
        } else {
          this.mainCharacter.walkingSound.pause()
        }

        element.animate(movement)
      }

      if (this.checkCollisions(element)) {
        element.position.x = x
        element.position.y = y
      }
    }
  }

  displayKeys() {
    const arrowKeysBottomWrapper = document.createElement('div')
    const controlsContainer = document.querySelector('#controls-container')
    controlsContainer.appendChild(arrowKeysBottomWrapper)

    this.keys.forEach((key) => {
      if (key.key.includes('Arrow')) {
        if (key.key !== 'ArrowUp') {
          new DisplayedKey(key, arrowKeysBottomWrapper)
        } else {
          new DisplayedKey(key)
        }
      } else if (key.action === 'Mode plein écran') {
        new DisplayedKey(key).onClick(() =>
          window.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: this.fullScreenKey.key,
            })
          )
        )
      } else {
        new DisplayedKey(key)
      }
    })
  }

  draw() {
    if (
      !this.mainCharacter.hitting &&
      !this.hitKey.pressed &&
      !this.mainCharacter.stop
    ) {
      if (this.upKey.pressed) {
        this.mainCharacter.isWalking = true
        this.move(this.mainCharacter, { y: -this.mapSpeed })
      } else if (this.leftKey.pressed) {
        this.mainCharacter.isWalking = true
        this.move(this.mainCharacter, { x: -this.mapSpeed })
      } else if (this.downKey.pressed) {
        this.mainCharacter.isWalking = true
        this.move(this.mainCharacter, { y: this.mapSpeed })
      } else if (this.rightKey.pressed) {
        this.mainCharacter.isWalking = true
        this.move(this.mainCharacter, { x: this.mapSpeed })
      } else if (
        !this.upKey.pressed &&
        !this.downKey.pressed &&
        !this.leftKey.pressed &&
        !this.rightKey.pressed
      ) {
        this.mainCharacter.currentVariantIndex = 0
        this.mainCharacter.isWalking = false
        this.rockSound.pause()
        this.rockSound.reset()
      }
    }

    if (
      this.runKey.pressed &&
      this.speedMeasure > 0 &&
      (this.upKey.pressed ||
        this.downKey.pressed ||
        this.leftKey.pressed ||
        this.rightKey.pressed)
    ) {
      this.mainCharacter.run = true
      this.speedMeasure -= 0.05
    } else {
      this.mainCharacter.run = false

      if (this.speedMeasure < 10) {
        this.speedMeasure += 0.01
      }
    }

    if (this.hitKey.pressed && this.mainCharacter.canHit) {
      this.mainCharacter.hit()
    }

    this.monster.lead()

    this.ctx.drawImage(
      this.map,
      -this.mainCharacter.x + this.canvas.width / 2,
      -this.mainCharacter.y + this.canvas.height / 2,
      this.mapWidth * this.mapZoom,
      this.mapHeight * this.mapZoom
    )

    this.elements.forEach((element) => {
      element.draw(
        this.ctx,
        element === this.mainCharacter
          ? this.canvas.width / 2
          : element.x - this.mainCharacter.x + this.canvas.width / 2,
        element === this.mainCharacter
          ? this.canvas.height / 2
          : element.y - this.mainCharacter.y + this.canvas.height / 2
      )
    })

    if (window.debug) {
      this.ctx.fillStyle = '#33d1d4aa'
      this.collisions?.forEach((collision) => {
        this.ctx.fillRect(
          collision.startX - this.mainCharacter.x + this.canvas.width / 2,
          collision.startY - this.mainCharacter.y + this.canvas.height / 2,
          collision.endX - collision.startX,
          collision.endY - collision.startY
        )
      })
      this.ctx.fillStyle = 'rgba(212,51,51,0.67)'
      this.zoneTriggerings
        ?.map((zoneTriggering) => zoneTriggering.zones)
        .flat()
        .forEach((zone) => {
          this.ctx.fillRect(
            zone.x - this.mainCharacter.x + this.canvas.width / 2,
            zone.y - this.mainCharacter.y + this.canvas.height / 2,
            zone.width,
            zone.height
          )
        })
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.draw()

    this.baptisteHud.baseLives = this.baptiste.baseLives
    this.baptisteHud.lives = this.baptiste.lives
    this.baptisteHud.speedMeasure = this.speedMeasure

    if (this.baptiste.lives <= 0) {
      this.triggerGameOver()
    }

    this.frame++
    const time = Date.now()

    if (time - this.startTime > 1000) {
      this.fps = Math.round(this.frame / ((time - this.startTime) / 1000))
      this.startTime = time
      this.frame = 0
      this.fpsCounter.text = this.fps
    }
  }
}

export default Game
