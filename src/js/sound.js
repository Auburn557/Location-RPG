import { Debug } from "./debug.js";

const context = new AudioContext();
const masterGain = 0.5;

export class Sound {
	/**
	 * 
	 * @param {(() => void) | null=} onComplete 
	 * @returns {void}
	 */
	play(onComplete) {

	}
}

class OneshotSound extends Sound {
	/**
	 * 
	 * @param {number} frequency 
	 * @param {number} gain 
	 * @param {OscillatorType} type
	 * @param {number} attack
	 * @param {number} release
	 */
	constructor(frequency, gain, type, attack, release) {
		super();
		this.pitch = frequency;
		this.gain = gain;
		this.type = type;
		this.attack = attack;
		this.release = release;
	}

	/**
	 * 
	 * @param {(() => void) | null=} onComplete 
	 * @returns {void}
	 */
	play(onComplete) {
		context.resume();
		const gain = context.createGain();
		const time = context.currentTime;
		const peakTime = time + this.attack;
		const outTime = peakTime + this.release;
		gain.gain.value = 0;
		gain.gain.linearRampToValueAtTime(this.gain * masterGain, peakTime);
		gain.gain.linearRampToValueAtTime(0, outTime);
		gain.connect(context.destination);
		const filter = context.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 550;
		filter.connect(gain);
		const oscillator = context.createOscillator();
		oscillator.type = this.type;
		oscillator.frequency.value = 440 * Math.pow(2, (this.pitch - 69) / 12);
		oscillator.start();
		oscillator.stop(outTime);
		oscillator.addEventListener("ended", () => {
			gain.disconnect();
			if (onComplete) { onComplete(); }
		});
		oscillator.connect(filter);
	}
}

class SoundClip extends Sound {
	/**
	 * 
	 * @param {string} path 
	 */
	constructor(path) {
		super();
		this.path = path;
		/** @type {AudioBuffer?} */
		this.buffer = null;
		this.isLoading = false;
	}

	/**
	 * 
	 * @param {() => void | null} callback 
	 * @returns 
	 */
	load(callback) {
		if (this.isLoading) { return; }
		Debug.log("Attempting to load sound " + this.path);
		this.isLoading = true;
		fetch("../assets/" + this.path + ".mp3")
			.then(response => response.arrayBuffer())
			.then(buffer => context.decodeAudioData(buffer))
			.then(audioBuffer => {
				Debug.log("Loaded sound " + this.path);
				this.buffer = audioBuffer;
				if (callback) {
					callback();
				}
			})
			.catch(reason => console.error(reason));
	}

	/**
	 * 
	 * @param {(() => void) | null=} onComplete 
	 * @returns 
	 */
	play(onComplete) {
		context.resume();
		this.load(() => this.play());
		const buffer = this.buffer;
		if (buffer === null) { return; }
		const gainNode = context.createGain();
		gainNode.gain.value = masterGain;
		gainNode.connect(context.destination);
		const sourceNode = context.createBufferSource();
		sourceNode.buffer = buffer;
		sourceNode.start();
		sourceNode.connect(gainNode);
		sourceNode.addEventListener("ended", () => {
			sourceNode.disconnect();
			if (onComplete) { onComplete(); }
		});
	}
}

Sound.pressDown = new OneshotSound(66, 1, "square", 0.01, 0.1);
Sound.pressUp = new OneshotSound(63, 0.2, "square", 0.01, 0.05);
Sound.pressLong = new OneshotSound(71, 1, "square", 0.01, 0.3);
Sound.option = new OneshotSound(73, 1, "sawtooth", 0.3, 0.3);
Sound.options = [73, 75, 76, 78, 80, 82, 83, 85, 87, 88].map(
	pitch => new OneshotSound(pitch, 1, "sawtooth", 0.1, 0.2)
);