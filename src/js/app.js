import { Debug } from "./debug.js";
import { say, choose, initializeFeed, next as nextFeedEntry } from "./feed.js";

const playButton = Debug.unwrap(document.getElementById("play"));
playButton.addEventListener("click", () => {
	playButton.parentElement?.removeChild(playButton);
	initializeFeed();
	function doLocation() {
		const metersToLatitude = 1 / 111133.333333;
		const radius = 100;
		const buffer = 100;
		say("Fetching your location...");
		navigator.geolocation.getCurrentPosition(
			position => {
				const coords = position.coords;
				say(
					"Your location is " +
					position.coords.latitude +
					" degrees latitude and " +
					position.coords.longitude +
					" degrees longitude."
				);
				say("Fetching local map data...")
				fetch(
					// Overpass endpoint
					"https://lz4.overpass-api.de/api/interpreter?data=" +
					// Specify json output format
					"[out:json];" +
					// Query all nodes, ways, and relations around our location.
					// Then, recurse the data, pulling in any data referenced by the previous query.
					// Then, store the result in a.
					`(nwr(around:${radius},${coords.latitude},${coords.longitude});>;)->.a;` +
					// Query all nodes, ways, and relations around our location plus a buffer amount
					// Then, intersect that with a.
					`nwr(around:${radius + buffer},${coords.latitude},${coords.longitude}).a;` +
					// Output normal data
					"out;"
					// The result is we get map data within the specified radius and pull in larger
					// shapes up to the specified buffer radius.
				)
					.then(response => response.text())
					.then(text => {
						say("Map data is " + (text.length / 1000) + " kilobytes.");
						const json = JSON.parse(text);
						console.log(json);
						/** @type {{tags?: Record<string, string>}[]} */
						const elements = json["elements"];
						const tags = new Set();
						elements.forEach(element => {
							const elementTags = element["tags"];
							if (elementTags) {
								Object.entries(elementTags).forEach(tag => {
									tags.add((tag[0] + " = " + tag[1]).replace("_", " "));
								});
							}

						});
						say(`Found ${elements.length} elements. Listing nearby tags.`);
						[...tags].sort().forEach(tag => say(tag));
					})
					.catch(error => {
						console.log(error);
						say("There was an error processing map data: " + error.message);
					});
			},
			error => { say("There was an error accessing your location: " + error.message) },
			{
				enableHighAccuracy: true,
			}
		);
	}
	function doIntro() {
		say("Welcome to the game.");
		choose()
			.choice("Press and hold anywhere to continue.", () => {
				say("Great! Are you ready to move on?");
				choose()
					.choice("No, take me back. Press anywhere to go to the next option.", () => {
						say("Let's try again.");
						doIntro();
					})
					.choice("Yes, let's continue. Press and hold to confirm this option.", () => {
						doLocation();
					})
			});
	}
	doIntro();
	nextFeedEntry();
});