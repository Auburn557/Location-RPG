// @ts-expect-error
window.goog = {
	/**
	 * 
	 * @param {*} path 
	 * @param {*} value 
	 * @returns {*}
	 */
	define: (path, value) => {
		return value;
	}
};