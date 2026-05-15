type SFXKey = 'dieRoll' | 'chaos' | 'planeswalk' | 'blank' | 'achievement' | 'buttonClick' | 'cardSlide'

const SFX_URLS: Record<SFXKey, string> = {
  dieRoll: 'https://cdn.freesound.org/previews/220/220744_4100837-lq.mp3',
  chaos: 'https://cdn.freesound.org/previews/523/523205_4100837-lq.mp3',
  planeswalk: 'https://cdn.freesound.org/previews/456/456966_5121236-lq.mp3',
  blank: 'https://cdn.freesound.org/previews/240/240776_4107740-lq.mp3',
  achievement: 'https://cdn.freesound.org/previews/270/270402_5123851-lq.mp3',
  buttonClick: 'https://cdn.freesound.org/previews/242/242501_4284968-lq.mp3',
  cardSlide: 'https://cdn.freesound.org/previews/240/240777_4107740-lq.mp3',
}

const MUSIC_URL = 'https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3'

class AudioManager {
  private sfxCache = new Map<string, HTMLAudioElement>()
  private music: HTMLAudioElement | null = null
  private _sfxEnabled = true
  private _musicEnabled = false
  private _musicVolume = 0.3
  private _sfxVolume = 0.5
  private initialized = false

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
    if (savedMusicVol !== null) this._musicVolume = parseFloat(savedMusicVol)
    if (savedSfxVol !== null) this._sfxVolume = parseFloat(savedSfxVol)
  }

  playSFX(key: SFXKey) {
    if (!this._sfxEnabled) return

    const url = SFX_URLS[key]
    if (!url) return

    try {
      const audio = new Audio(url)
      audio.volume = this._sfxVolume
      audio.play().catch(() => {})
    } catch {}
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
