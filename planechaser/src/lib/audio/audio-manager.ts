type SFXKey =
  | 'dieRoll'
  | 'chaos'
  | 'chaosImpact'
  | 'planeswalk'
  | 'planeswalkWhoosh'
  | 'planeswalkSwell'
  | 'blank'
  | 'achievement'
  | 'buttonClick'
  | 'cardSlide'

const SFX_URLS: Record<SFXKey, string> = {
  dieRoll: 'https://cdn.freesound.org/previews/766/766177_13450799-lq.mp3',
  chaos: 'https://cdn.freesound.org/previews/207/207755_2605156-lq.mp3',
  chaosImpact: 'https://cdn.freesound.org/previews/829/829499_9839964-lq.mp3',
  planeswalk: 'https://cdn.freesound.org/previews/456/456966_5121236-lq.mp3',
  planeswalkSwell: 'https://cdn.freesound.org/previews/411/411169_7395592-lq.mp3',
  planeswalkWhoosh: 'https://cdn.freesound.org/previews/749/749413_16214459-lq.mp3',
  blank: 'https://cdn.freesound.org/previews/240/240776_4107740-lq.mp3',
  achievement: 'https://cdn.freesound.org/previews/270/270402_5123851-lq.mp3',
  buttonClick: 'https://cdn.freesound.org/previews/242/242501_4284968-lq.mp3',
  cardSlide: 'https://cdn.freesound.org/previews/240/240777_4107740-lq.mp3',
}

const MUSIC_URL = 'https://cdn.freesound.org/previews/649/649132_12946258-lq.mp3'

class AudioManager {
  private music: HTMLAudioElement | null = null
  private _sfxEnabled = true
  private _musicEnabled = false
  private _musicVolume = 0.3
  private _sfxVolume = 0.5
  private _baseMusicVolume = 0.3
  private initialized = false
  private duckTimeout: ReturnType<typeof setTimeout> | null = null

  get sfxEnabled() { return this._sfxEnabled }
  get musicEnabled() { return this._musicEnabled }
  get musicVolume() { return this._musicVolume }
  get sfxVolume() { return this._sfxVolume }

  init() {
    if (this.initialized) return
    this.initialized = true

    const savedSfx = localStorage.getItem('pc_sfx')
    const savedMusic = localStorage.getItem('pc_music')
    const savedMusicVol = localStorage.getItem('pc_music_vol')
    const savedSfxVol = localStorage.getItem('pc_sfx_vol')

    if (savedSfx !== null) this._sfxEnabled = savedSfx === 'true'
    if (savedMusic !== null) this._musicEnabled = savedMusic === 'true'
    if (savedMusicVol !== null) {
      this._musicVolume = parseFloat(savedMusicVol)
      this._baseMusicVolume = this._musicVolume
    }
    if (savedSfxVol !== null) this._sfxVolume = parseFloat(savedSfxVol)
  }

  playSFX(key: SFXKey, volumeMultiplier = 1) {
    if (!this._sfxEnabled) return

    const url = SFX_URLS[key]
    if (!url) return

    try {
      const audio = new Audio(url)
      audio.volume = Math.min(1, this._sfxVolume * volumeMultiplier)
      audio.play().catch(() => {})
    } catch {}
  }

  playChaosLayered() {
    if (!this._sfxEnabled) return
    this.playSFX('chaos', 0.9)
    setTimeout(() => this.playSFX('chaosImpact', 0.7), 150)
  }

  playPlaneswalkLayered() {
    if (!this._sfxEnabled) return
    this.duckMusic()
    this.playSFX('planeswalkSwell', 0.8)
    setTimeout(() => this.playSFX('planeswalkWhoosh', 0.9), 400)
    setTimeout(() => this.playSFX('cardSlide', 0.6), 800)
  }

  private duckMusic() {
    if (!this.music || !this._musicEnabled) return

    if (this.duckTimeout) clearTimeout(this.duckTimeout)

    const targetVol = this._baseMusicVolume * 0.15
    this.fadeMusic(targetVol, 300)

    this.duckTimeout = setTimeout(() => {
      this.fadeMusic(this._baseMusicVolume, 800)
      this.duckTimeout = null
    }, 2500)
  }

  private fadeMusic(targetVol: number, durationMs: number) {
    if (!this.music) return

    const startVol = this.music.volume
    const diff = targetVol - startVol
    const steps = 20
    const stepMs = durationMs / steps
    let step = 0

    const interval = setInterval(() => {
      step++
      if (!this.music || step >= steps) {
        if (this.music) this.music.volume = Math.max(0, Math.min(1, targetVol))
        clearInterval(interval)
        return
      }
      const progress = step / steps
      const eased = progress * progress * (3 - 2 * progress)
      this.music.volume = Math.max(0, Math.min(1, startVol + diff * eased))
    }, stepMs)
  }

  toggleMusic(enabled?: boolean) {
    this._musicEnabled = enabled ?? !this._musicEnabled
    localStorage.setItem('pc_music', String(this._musicEnabled))

    if (this._musicEnabled) {
      this.startMusic()
    } else {
      this.stopMusic()
    }
  }

  toggleSFX(enabled?: boolean) {
    this._sfxEnabled = enabled ?? !this._sfxEnabled
    localStorage.setItem('pc_sfx', String(this._sfxEnabled))
  }

  setMusicVolume(vol: number) {
    this._musicVolume = vol
    this._baseMusicVolume = vol
    localStorage.setItem('pc_music_vol', String(vol))
    if (this.music) this.music.volume = vol
  }

  setSFXVolume(vol: number) {
    this._sfxVolume = vol
    localStorage.setItem('pc_sfx_vol', String(vol))
  }

  startMusic() {
    if (!this._musicEnabled) return
    if (this.music) {
      this.music.play().catch(() => {})
      return
    }

    this.music = new Audio(MUSIC_URL)
    this.music.loop = true
    this.music.volume = this._musicVolume
    this.music.play().catch(() => {})
  }

  stopMusic() {
    if (this.music) {
      this.music.pause()
    }
  }
}

export const audioManager = new AudioManager()
export type { SFXKey }
