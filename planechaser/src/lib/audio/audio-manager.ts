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

type MusicKey =
  | 'medievil'
  | 'natureAmbo'
  | 'skyrim'
  | 'dreamIntro'
  | 'ancientManuscripts'
  | 'pianoWindChimes'
  | 'theInnOfTheLastHome'

const MUSIC_URLS: Record<MusicKey, string> = {
  medievil: 'https://cdn.freesound.org/previews/649/649132_12946258-lq.mp3',
  natureAmbo: 'https://cdn.freesound.org/previews/634/634140_2282212-lq.mp3',
  skyrim: 'https://cdn.freesound.org/previews/770/770560_858088-lq.mp3',
  dreamIntro: 'https://cdn.freesound.org/previews/264/264199_3525275-lq.mp3',
  ancientManuscripts: 'https://cdn.freesound.org/previews/620/620673_1766049-lq.mp3',
  pianoWindChimes: 'https://cdn.freesound.org/previews/803/803509_17289332-lq.mp3',
  theInnOfTheLastHome: 'https://cdn.freesound.org/previews/725/725830_34173-lq.mp3',
}

const MUSIC_KEYS = Object.keys(MUSIC_URLS) as MusicKey[]

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

class AudioManager {
  private music: HTMLAudioElement | null = null
  private musicPlaylist: MusicKey[] = []
  private musicIndex = 0
  private ambient: HTMLAudioElement | null = null
  private currentAmbientUrl: string | null = null
  private _sfxEnabled = true
  private _musicEnabled = false
  private _ambientEnabled = true
  private _musicVolume = 0.3
  private _sfxVolume = 0.5
  private _ambientVolume = 0.25
  private _baseMusicVolume = 0.3
  private initialized = false
  private duckTimeout: ReturnType<typeof setTimeout> | null = null

  get sfxEnabled() { return this._sfxEnabled }
  get musicEnabled() { return this._musicEnabled }
  get ambientEnabled() { return this._ambientEnabled }
  get musicVolume() { return this._musicVolume }
  get sfxVolume() { return this._sfxVolume }
  get ambientVolume() { return this._ambientVolume }

  init() {
    if (this.initialized) return
    this.initialized = true

    const savedSfx = localStorage.getItem('pc_sfx')
    const savedMusic = localStorage.getItem('pc_music')
    const savedMusicVol = localStorage.getItem('pc_music_vol')
    const savedSfxVol = localStorage.getItem('pc_sfx_vol')

    const savedAmbient = localStorage.getItem('pc_ambient')
    const savedAmbientVol = localStorage.getItem('pc_ambient_vol')

    if (savedSfx !== null) this._sfxEnabled = savedSfx === 'true'
    if (savedMusic !== null) this._musicEnabled = savedMusic === 'true'
    if (savedAmbient !== null) this._ambientEnabled = savedAmbient === 'true'
    if (savedMusicVol !== null) {
      this._musicVolume = parseFloat(savedMusicVol)
      this._baseMusicVolume = this._musicVolume
    }
    if (savedSfxVol !== null) this._sfxVolume = parseFloat(savedSfxVol)
    if (savedAmbientVol !== null) this._ambientVolume = parseFloat(savedAmbientVol)
  }

  playSFX(key: SFXKey, volumeMultiplier = 1, maxDurationMs?: number) {
    if (!this._sfxEnabled) return

    const url = SFX_URLS[key]
    if (!url) return

    try {
      const audio = new Audio(url)
      const vol = Math.min(1, this._sfxVolume * volumeMultiplier)
      audio.volume = vol
      audio.play().catch(() => {})

      if (maxDurationMs) {
        const fadeStart = maxDurationMs - 300
        setTimeout(() => {
          let step = 0
          const interval = setInterval(() => {
            step++
            if (step >= 10 || audio.paused) { audio.pause(); clearInterval(interval); return }
            audio.volume = Math.max(0, vol * (1 - step / 10))
          }, 30)
        }, Math.max(0, fadeStart))
      }
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

    this.musicPlaylist = shuffleArray(MUSIC_KEYS)
    this.musicIndex = 0
    this.playCurrentTrack()
  }

  private playCurrentTrack() {
    if (this.music) {
      this.music.pause()
      this.music.removeAttribute('src')
      this.music = null
    }

    const key = this.musicPlaylist[this.musicIndex]
    const url = MUSIC_URLS[key]

    this.music = new Audio(url)
    this.music.volume = this._musicVolume
    this.music.play().catch(() => {})

    this.music.addEventListener('ended', () => {
      this.musicIndex = (this.musicIndex + 1) % this.musicPlaylist.length
      if (this.musicIndex === 0) {
        this.musicPlaylist = shuffleArray(MUSIC_KEYS)
      }
      this.playCurrentTrack()
    })
  }

  stopMusic() {
    if (this.music) {
      this.music.pause()
      this.music = null
    }
  }

  toggleAmbient(enabled?: boolean) {
    this._ambientEnabled = enabled ?? !this._ambientEnabled
    localStorage.setItem('pc_ambient', String(this._ambientEnabled))

    if (!this._ambientEnabled) {
      this.stopAmbient()
    }
  }

  setAmbientVolume(vol: number) {
    this._ambientVolume = vol
    localStorage.setItem('pc_ambient_vol', String(vol))
    if (this.ambient) this.ambient.volume = vol
  }

  playAmbient(url: string) {
    if (!this._ambientEnabled) return

    if (this.currentAmbientUrl === url && this.ambient) {
      this.ambient.play().catch(() => {})
      return
    }

    this.stopAmbient()
    this.currentAmbientUrl = url

    this.ambient = new Audio(url)
    this.ambient.loop = true
    this.ambient.volume = 0
    this.ambient.play().catch(() => {})

    const targetVol = this._ambientVolume
    let step = 0
    const steps = 30
    const interval = setInterval(() => {
      step++
      if (!this.ambient || step >= steps) {
        if (this.ambient) this.ambient.volume = targetVol
        clearInterval(interval)
        return
      }
      this.ambient.volume = targetVol * (step / steps)
    }, 50)
  }

  stopAmbient() {
    if (this.ambient) {
      this.ambient.pause()
      this.ambient = null
      this.currentAmbientUrl = null
    }
  }

  stopAll() {
    this.stopMusic()
    this.stopAmbient()
  }
}

export const audioManager = new AudioManager()
export type { SFXKey }
