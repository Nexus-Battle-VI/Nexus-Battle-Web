#!/usr/bin/env node
/**
 * Musica y efectos de sonido de la batalla de Jugar Online (EN-031), compuestos
 * aqui mismo: ondas cuadradas, triangulares y ruido, como una consola de 8 bits.
 * Es una composicion original y determinista (el ruido sale de un generador
 * con semilla fija), asi que no hay ficheros de terceros ni licencias que
 * registrar, y volver a ejecutarlo produce exactamente los mismos bytes.
 *
 *   node scripts/compose-battle-audio.mjs
 *
 * Salida: `public/assets/audio/battle/*.wav` (PCM 16 bits, mono, 22 050 Hz).
 * Los reproduce Howler (`src/shared/sound/battleAudio.ts`).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const RATE = 22050
const OUT = resolve('public/assets/audio/battle')

/**
 * Generador congruencial con semilla fija: el mismo ruido en cada ejecucion.
 * @param {number} seed
 * @returns {() => number}
 */
const noiseSource = (seed) => {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return (state / 0xffffffff) * 2 - 1
  }
}

/** @param {number} midi @returns {number} */
const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12)

/**
 * Pista vacia de `seconds` segundos.
 * @param {number} seconds
 * @returns {Float32Array}
 */
const track = (seconds) => new Float32Array(Math.ceil(seconds * RATE))

/** @typedef {'square' | 'triangle' | 'sine'} Wave */
/** @type {Record<Wave, (phase: number, duty?: number) => number>} */
const OSC = {
  square: (phase, duty = 0.5) => (phase % 1 < duty ? 1 : -1),
  triangle: (phase) => 1 - 4 * Math.abs((phase % 1) - 0.5),
  sine: (phase) => Math.sin(2 * Math.PI * phase),
}

/**
 * @typedef {object} NoteSpec
 * @property {number} start
 * @property {number} dur
 * @property {number} freq
 * @property {number} [slideTo]
 * @property {Wave} [wave]
 * @property {number} [duty]
 * @property {number} [level]
 * @property {number} [decay]
 * @property {number} [vibrato]
 */

/**
 * Suma una nota a la pista. `freq` puede deslizarse hasta `slideTo`; la
 * envolvente es ataque corto, caida exponencial suave y un final sin clic.
 * @param {Float32Array} buffer
 * @param {NoteSpec} spec
 */
const note = (
  buffer,
  {
    start,
    dur,
    freq,
    slideTo = freq,
    wave = 'square',
    duty = 0.5,
    level = 0.2,
    decay = 0,
    vibrato = 0,
  },
) => {
  const from = Math.floor(start * RATE)
  const length = Math.floor(dur * RATE)
  const attack = Math.min(0.006 * RATE, length / 4)
  const release = Math.min(0.02 * RATE, length / 3)
  let phase = 0
  for (let i = 0; i < length && from + i < buffer.length; i++) {
    const t = i / length
    const vib = vibrato === 0 ? 1 : 1 + vibrato * Math.sin((2 * Math.PI * 5.5 * i) / RATE)
    phase += ((freq + (slideTo - freq) * t) * vib) / RATE
    let env = 1
    if (i < attack) env = i / attack
    if (i > length - release) env *= (length - i) / release
    if (decay > 0) env *= Math.exp((-decay * i) / RATE)
    buffer[from + i] = (buffer[from + i] ?? 0) + OSC[wave](phase, duty) * env * level
  }
}

/**
 * Golpe de ruido filtrado (caja, platillo, impacto).
 * @param {Float32Array} buffer
 * @param {{ start: number, dur: number, level?: number, decay?: number, tone?: number, seed?: number }} spec
 */
const noise = (buffer, { start, dur, level = 0.2, decay = 30, tone = 0.5, seed = 7 }) => {
  const random = noiseSource(seed)
  const from = Math.floor(start * RATE)
  const length = Math.floor(dur * RATE)
  let low = 0
  for (let i = 0; i < length && from + i < buffer.length; i++) {
    low += tone * (random() - low)
    const env = Math.exp((-decay * i) / RATE) * Math.min(1, (length - i) / (0.01 * RATE))
    buffer[from + i] = (buffer[from + i] ?? 0) + low * env * level
  }
}

/**
 * Bombo: un seno que cae de tono muy rapido.
 * @param {Float32Array} buffer
 * @param {number} start
 * @param {number} [level]
 */
const kick = (buffer, start, level = 0.55) => {
  note(buffer, { start, dur: 0.16, freq: 140, slideTo: 42, wave: 'sine', level, decay: 18 })
}

/**
 * Suaviza el filo de las cuadradas (filtro de un polo) y normaliza el pico.
 * @param {Float32Array} buffer
 * @param {number} [peak]
 * @param {number} [smoothing]
 * @returns {Float32Array}
 */
const master = (buffer, peak = 0.82, smoothing = 0.55) => {
  let low = 0
  let max = 0
  for (let i = 0; i < buffer.length; i++) {
    low += smoothing * ((buffer[i] ?? 0) - low)
    buffer[i] = low
    max = Math.max(max, Math.abs(low))
  }
  const gain = max === 0 ? 1 : peak / max
  for (let i = 0; i < buffer.length; i++) buffer[i] = (buffer[i] ?? 0) * gain
  return buffer
}

/** @param {Float32Array} buffer @returns {Buffer} */
const wav = (buffer) => {
  const data = Buffer.alloc(buffer.length * 2)
  for (let i = 0; i < buffer.length; i++) {
    const sample = Math.max(-1, Math.min(1, buffer[i] ?? 0))
    data.writeInt16LE(Math.round(sample * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

// ---------------------------------------------------------------------------
// Tema de batalla: La menor, 150 pulsos por minuto, 16 compases en bucle.
// ---------------------------------------------------------------------------

const BPM = 150
const EIGHTH = 60 / BPM / 2
const BAR = EIGHTH * 8

const N = { A2: 45, F2: 41, C3: 48, G2: 43, E2: 40 }
/** @type {readonly [number, readonly number[]][]} */
const CHORDS = [
  [N.A2, [57, 60, 64]],
  [N.F2, [53, 57, 60]],
  [N.C3, [55, 60, 64]],
  [N.G2, [55, 59, 62]],
  [N.A2, [57, 60, 64]],
  [N.F2, [53, 57, 60]],
  [N.G2, [55, 59, 62]],
  [N.E2, [56, 59, 64]],
]

// [midi, corcheas]; `null` es silencio. Ocho corcheas por compas.
/** @type {readonly (readonly [number | null, number])[][]} */
const MELODY = [
  [
    [69, 2],
    [72, 1],
    [76, 1],
    [74, 2],
    [72, 2],
  ],
  [
    [72, 2],
    [69, 1],
    [72, 1],
    [77, 2],
    [76, 2],
  ],
  [
    [76, 2],
    [79, 1],
    [76, 1],
    [74, 2],
    [72, 2],
  ],
  [
    [74, 3],
    [71, 1],
    [67, 2],
    [71, 2],
  ],
  [
    [69, 1],
    [71, 1],
    [72, 1],
    [76, 1],
    [81, 2],
    [79, 2],
  ],
  [
    [77, 2],
    [76, 1],
    [74, 1],
    [72, 2],
    [69, 2],
  ],
  [
    [71, 2],
    [74, 1],
    [79, 1],
    [77, 2],
    [74, 2],
  ],
  [
    [76, 4],
    [68, 2],
    [71, 2],
  ],
  [
    [76, 1],
    [81, 1],
    [84, 2],
    [83, 1],
    [81, 1],
    [76, 2],
  ],
  [
    [77, 1],
    [81, 1],
    [84, 2],
    [81, 2],
    [77, 2],
  ],
  [
    [79, 2],
    [76, 1],
    [79, 1],
    [84, 2],
    [83, 2],
  ],
  [
    [86, 2],
    [83, 1],
    [79, 1],
    [74, 2],
    [null, 2],
  ],
  [
    [72, 2],
    [76, 2],
    [81, 2],
    [84, 2],
  ],
  [
    [81, 2],
    [77, 2],
    [72, 2],
    [77, 2],
  ],
  [
    [79, 2],
    [83, 2],
    [86, 2],
    [83, 2],
  ],
  [
    [76, 2],
    [80, 2],
    [83, 2],
    [88, 2],
  ],
]

const battleTheme = () => {
  const buffer = track(BAR * MELODY.length)
  MELODY.forEach((bar, index) => {
    const barStart = index * BAR
    const [root, triad] = CHORDS[index % CHORDS.length] ?? [N.A2, [57, 60, 64]]

    // Melodia: pulso estrecho, con un poco de vibrato en las notas largas.
    let cursor = barStart
    for (const [midi, eighths] of bar) {
      const dur = eighths * EIGHTH
      if (midi !== null) {
        note(buffer, {
          start: cursor,
          dur: dur * 0.92,
          freq: midiToHz(midi),
          duty: 0.25,
          level: 0.2,
          decay: 1.5,
          vibrato: eighths >= 3 ? 0.006 : 0,
        })
      }
      cursor += dur
    }

    // Bajo: corcheas alternando fundamental y octava.
    for (let step = 0; step < 8; step++) {
      note(buffer, {
        start: barStart + step * EIGHTH,
        dur: EIGHTH * 0.85,
        freq: midiToHz(root + (step % 2 === 0 ? 0 : 12)),
        wave: 'triangle',
        level: 0.3,
      })
    }

    // Arpegio: semicorcheas del acorde, muy bajito, por debajo de la melodia.
    for (let step = 0; step < 16; step++) {
      note(buffer, {
        start: barStart + (step * EIGHTH) / 2,
        dur: EIGHTH * 0.4,
        freq: midiToHz(triad[step % 3] ?? root),
        duty: 0.125,
        level: 0.055,
      })
    }

    // Bateria: bombo en 1 y 3 (y un adelanto en el "y" del 4 cada dos compases),
    // caja en 2 y 4, platillo cerrado en corcheas.
    for (let beat = 0; beat < 4; beat++) {
      const at = barStart + beat * 2 * EIGHTH
      if (beat % 2 === 0) kick(buffer, at)
      else
        noise(buffer, { start: at, dur: 0.14, level: 0.32, decay: 26, tone: 0.75, seed: 11 + beat })
    }
    if (index % 2 === 1) kick(buffer, barStart + 7 * EIGHTH, 0.4)
    for (let step = 0; step < 8; step++) {
      noise(buffer, {
        start: barStart + step * EIGHTH,
        dur: 0.03,
        level: step % 2 === 0 ? 0.09 : 0.06,
        decay: 120,
        tone: 0.95,
        seed: 101 + step,
      })
    }
  })
  return master(buffer, 0.8, 0.6)
}

// ---------------------------------------------------------------------------
// Fanfarrias de final.
// ---------------------------------------------------------------------------

const victory = () => {
  const buffer = track(2.6)
  const run = [67, 72, 76, 79]
  run.forEach((midi, i) => {
    note(buffer, { start: i * 0.09, dur: 0.09, freq: midiToHz(midi), duty: 0.25, level: 0.22 })
  })
  for (const midi of [72, 76, 79, 84]) {
    note(buffer, {
      start: 0.38,
      dur: 1.9,
      freq: midiToHz(midi),
      duty: 0.5,
      level: 0.1,
      decay: 1.4,
      vibrato: 0.005,
    })
  }
  note(buffer, {
    start: 0.38,
    dur: 1.9,
    freq: midiToHz(48),
    wave: 'triangle',
    level: 0.32,
    decay: 1.2,
  })
  kick(buffer, 0.38, 0.5)
  noise(buffer, { start: 0.38, dur: 1.2, level: 0.12, decay: 4, tone: 0.9, seed: 5 })
  return master(buffer)
}

const defeat = () => {
  const buffer = track(3)
  ;[69, 67, 65, 64].forEach((midi, i) => {
    note(buffer, {
      start: i * 0.32,
      dur: 0.3,
      freq: midiToHz(midi),
      duty: 0.5,
      level: 0.2,
      decay: 2,
    })
  })
  note(buffer, {
    start: 1.28,
    dur: 1.6,
    freq: midiToHz(52),
    slideTo: midiToHz(50),
    duty: 0.5,
    level: 0.16,
    decay: 1.6,
    vibrato: 0.01,
  })
  note(buffer, {
    start: 1.28,
    dur: 1.6,
    freq: midiToHz(33),
    wave: 'triangle',
    level: 0.34,
    decay: 1.4,
  })
  return master(buffer, 0.75)
}

// ---------------------------------------------------------------------------
// Efectos de la accion publicada por Combat.
// ---------------------------------------------------------------------------

const attack = () => {
  const buffer = track(0.36)
  noise(buffer, { start: 0, dur: 0.12, level: 0.35, decay: 18, tone: 0.35, seed: 21 })
  note(buffer, { start: 0, dur: 0.1, freq: 900, slideTo: 260, duty: 0.25, level: 0.12 })
  kick(buffer, 0.1, 0.6)
  noise(buffer, { start: 0.1, dur: 0.18, level: 0.4, decay: 22, tone: 0.6, seed: 22 })
  return master(buffer)
}

const critical = () => {
  const buffer = track(0.6)
  noise(buffer, { start: 0, dur: 0.1, level: 0.35, decay: 16, tone: 0.35, seed: 31 })
  note(buffer, { start: 0, dur: 0.1, freq: 1200, slideTo: 300, duty: 0.25, level: 0.14 })
  kick(buffer, 0.09, 0.8)
  noise(buffer, { start: 0.09, dur: 0.4, level: 0.5, decay: 9, tone: 0.5, seed: 32 })
  note(buffer, { start: 0.09, dur: 0.35, freq: 220, slideTo: 70, duty: 0.5, level: 0.18 })
  return master(buffer, 0.9)
}

const block = () => {
  const buffer = track(0.4)
  noise(buffer, { start: 0, dur: 0.08, level: 0.25, decay: 20, tone: 0.4, seed: 41 })
  for (const freq of [1480, 2210]) {
    note(buffer, { start: 0.06, dur: 0.3, freq, duty: 0.5, level: 0.07, decay: 14 })
  }
  noise(buffer, { start: 0.06, dur: 0.12, level: 0.2, decay: 40, tone: 0.95, seed: 42 })
  return master(buffer, 0.7)
}

const skill = () => {
  const buffer = track(0.75)
  ;[64, 68, 71, 76, 80].forEach((midi, i) => {
    note(buffer, { start: i * 0.05, dur: 0.12, freq: midiToHz(midi), duty: 0.125, level: 0.16 })
  })
  note(buffer, {
    start: 0.22,
    dur: 0.45,
    freq: midiToHz(88),
    slideTo: midiToHz(76),
    wave: 'triangle',
    level: 0.18,
    decay: 5,
  })
  noise(buffer, { start: 0.25, dur: 0.4, level: 0.18, decay: 9, tone: 0.9, seed: 51 })
  return master(buffer, 0.75)
}

const heal = () => {
  const buffer = track(0.9)
  ;[72, 76, 79, 84].forEach((midi, i) => {
    note(buffer, {
      start: i * 0.1,
      dur: 0.5,
      freq: midiToHz(midi),
      wave: 'triangle',
      level: 0.2,
      decay: 4,
      vibrato: 0.004,
    })
  })
  noise(buffer, { start: 0.3, dur: 0.5, level: 0.06, decay: 6, tone: 0.97, seed: 61 })
  return master(buffer, 0.7)
}

const epic = () => {
  const buffer = track(1.4)
  note(buffer, { start: 0, dur: 0.45, freq: 110, slideTo: 880, duty: 0.25, level: 0.16 })
  noise(buffer, { start: 0, dur: 0.45, level: 0.12, decay: 2, tone: 0.5, seed: 71 })
  kick(buffer, 0.45, 0.9)
  noise(buffer, { start: 0.45, dur: 0.8, level: 0.45, decay: 5, tone: 0.45, seed: 72 })
  for (const midi of [45, 52, 57, 60, 64]) {
    note(buffer, {
      start: 0.45,
      dur: 0.9,
      freq: midiToHz(midi),
      duty: 0.5,
      level: 0.09,
      decay: 2.5,
    })
  }
  return master(buffer, 0.9)
}

const turn = () => {
  const buffer = track(0.3)
  note(buffer, { start: 0, dur: 0.08, freq: midiToHz(76), duty: 0.25, level: 0.2 })
  note(buffer, { start: 0.09, dur: 0.18, freq: midiToHz(83), duty: 0.25, level: 0.2, decay: 6 })
  return master(buffer, 0.6)
}

/** @type {Record<string, () => Float32Array>} */
const SOUNDS = {
  'battle-theme': battleTheme,
  victory,
  defeat,
  attack,
  critical,
  block,
  skill,
  heal,
  epic,
  turn,
}

mkdirSync(OUT, { recursive: true })
for (const [name, compose] of Object.entries(SOUNDS)) {
  const file = join(OUT, `${name}.wav`)
  const bytes = wav(compose())
  writeFileSync(file, bytes)
  process.stdout.write(`   ${name}.wav  ${String(Math.round(bytes.length / 1024))} KB\n`)
}
