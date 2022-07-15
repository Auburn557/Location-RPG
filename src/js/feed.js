import { Debug } from "./debug.js";
import { Sound } from "./sound.js";

class FeedEntry {

	constructor() {
		/**
		 * @type {HTMLElement}
		 * @readonly
		 */
		this.element = document.createElement("p");
		this.element.id = String(messageNumber++);
	}

	doDisplay() { }

	/**
	 * @protected
	 */
	doAction() { }

	/**
	 * @protected
	 */
	doLongAction() { }

	onCancelled() { }

	onEnd() {
	}

	static initialize() {
		window.addEventListener("pointerdown", () => {
			Sound.pressDown.play();
			longPressTimeout = setTimeout(() => {
				const entry = displayedEntries[displayedEntries.length - 1];
				if (entry !== undefined) {
					entry.doLongAction();
				}
				longPressTimeout = null;
			}, 400);
		});

		window.addEventListener("pointerup", () => {
			Sound.pressUp.play();
			if (longPressTimeout === null) {
				return;
			}
			clearTimeout(longPressTimeout);
			const entry = displayedEntries[displayedEntries.length - 1];
			if (entry !== undefined) {
				entry.doAction();
			}
		});
	}

	static next() {
		const current = displayedEntries[displayedEntries.length - 1];
		if (current !== undefined) {
			current.onEnd();
		}
		const entry = feedQueue.shift();
		if (entry === undefined) { return; }
		entry.doDisplay();
		const element = entry.element;
		feed.appendChild(element);
		displayedEntries.push(entry);
		location.hash = element.id;

		// Remove expired entires
		const count = displayedEntries.length - 40;
		for (let i = 0; i < count; i++) {
			const entry = Debug.defined(displayedEntries.shift());
			const element = entry.element;
			element.classList.add("fade");
			element.addEventListener("animationend", () => {
				if (!removed.has(entry)) {
					removed.add(entry);
					cancelAnimationFrame(animationFrame);
					let frameCount = 3;
					function checkRemove() {
						console.log("Frame: " + animationFrame);
						if (window.scrollY + window.innerHeight >= document.body.scrollHeight) {
							frameCount--;
						} else {
							frameCount = 3;
						}
						if (frameCount <= 0) {
							removed.forEach(
								entry => entry.element.parentElement?.removeChild(entry.element)
							);
							removed.clear();
							return;
						}
						animationFrame = requestAnimationFrame(checkRemove);
					}
					animationFrame = requestAnimationFrame(checkRemove);
				}
			});
		}
	}
}

/**
 * 
 * @param {FeedContent[]} content 
 * @param {() => any=} onEnd
 */
function narrateContent(content, onEnd) {
	speechSynthesis.cancel();
	let last = null;
	for (const item of content) {
		last = new SpeechSynthesisUtterance(typeof item === "string" ? item : item.text);
		speechSynthesis.speak(last);
	}
	if (last !== null && onEnd !== undefined) {
		last.addEventListener("end", onEnd);
	}
}

/**
 * 
 * @param {FeedContent[]} content 
 */
function displayContent(content) {
	const fragment = document.createDocumentFragment();
	fragment.append(document.createTextNode(
		content
			.map(
				item => typeof item === "string" ? item : item.text
			)
			.join("")
	));
	return fragment;
}

/**
 * @typedef {string | FeedText} FeedContent
 */

class FeedText {
	/**
	 * 
	 * @param {string} text 
	 */
	constructor(text) {
		/** @readonly */
		this.text = text;
	}
}

class SayFeedEntry extends FeedEntry {
	/**
	 * 
	 * @param {FeedContent[]} content 
	 */
	constructor(content) {
		super();
		/** @private */
		this.content = content;
		/** @private */
		this.skipped = false;
	}

	doAction() {
		this.skipped = true;
		FeedEntry.next();
	}

	doDisplay() {
		this.element.appendChild(displayContent(this.content));
		narrateContent(this.content, () => {
			if (!this.skipped) {
				FeedEntry.next();
			}
		});
	}
}

class ChooseFeedEntry extends FeedEntry {
	constructor() {
		super();
		/** @private */
		this.list = document.createElement("ul");
		/**
		 * @type {[content: FeedContent[], actions: (() => any)[], item: HTMLLIElement][]}
		 * @private
		 */
		this.choices = [];
		/** @private */
		this.selected = 0;
		this.element.appendChild(this.list);
		this.chosen = false;
	}

	doDisplay() {
		this.choices.forEach(choice => {
			choice[2].appendChild(displayContent(choice[0]));
		});
		this.choices.forEach(choice => this.list.appendChild(choice[2]));
		this.readChoice();
	}

	/**
	 * 
	 * @param  {(FeedContent | (() => any))[]} contentOrAction
	 */
	choice(...contentOrAction) {
		/** @type {FeedContent[]} */
		const content = [];
		/** @type {(() => any)[]} */
		const actions = [];
		for (const item of contentOrAction) {
			if (typeof item === "function") {
				actions.push(item);
			} else {
				content.push(item);
			}
		}
		this.choices.push([content, actions, document.createElement("li")]);
		return this;
	}

	doAction() {
		speechSynthesis.cancel();
		if (!this.chosen) {
			this.selected = (this.selected + 1) % this.choices.length;
		}
		this.readChoice();
	}

	doLongAction() {
		const choice = Debug.defined(this.choices[this.selected]);
		speechSynthesis.cancel();
		Sound.pressLong.play(() => {
			if (!this.chosen) {
				choice[1].forEach(action => action());
			}
			this.chosen = true;
			FeedEntry.next();
		});
	}

	readChoice() {
		this.choices.forEach(choice => choice[2].classList.remove("selected"));
		const [content, , item] = Debug.defined(this.choices[this.selected]);
		item.classList.add("selected");
		Debug.defined(Sound.options[this.selected % Sound.options.length]).play(
			() => narrateContent(content)
		);
	}
}

/** @type {FeedEntry[]} */
const feedQueue = [];
/** @type {FeedEntry[]} */
const displayedEntries = [];

/** @type {Set<FeedEntry>} */
const removed = new Set();

const feed = Debug.unwrap(document.getElementById("feed"));

let messageNumber = 0;
let animationFrame = -1;

/** @type {*} */
let longPressTimeout = null;

/**
 * 
 * @param {FeedEntry} entry 
 */
function addFeedEntry(entry) {
	feedQueue.push(entry);
}

/**
 * @typedef {{
 * 		text: string,
 * 		pitch?: number,
 * 		rate?: number
 * }} LinePart
 */

/**
 * @param {FeedContent[]} text
 */
export function say(...text) {
	const say = new SayFeedEntry(
		text.map(content => typeof content === "string" ? new FeedText(content) : content)
	);
	addFeedEntry(say);
	return say;
}

export function choose() {
	const choose = new ChooseFeedEntry();
	addFeedEntry(choose);
	return choose;
}

/**
 * 
 * @param {string} text
 */
export function text(text) {
	return new FeedText(text);
}

export const next = FeedEntry.next;

export const initializeFeed = FeedEntry.initialize;