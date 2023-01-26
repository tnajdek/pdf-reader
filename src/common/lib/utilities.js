export function isMac() {
	return !!navigator && /Mac/.test(navigator.platform);
}

export function isLinux() {
	return !!navigator && /Linux/.test(navigator.platform);
}

export function isWin() {
	return !!navigator && /Win/.test(navigator.platform);
}

// https://stackoverflow.com/a/9851769
export let isFirefox = typeof InstallTrigger !== 'undefined';
export let isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && window['safari'].pushNotification));

// https://github.com/jashkenas/underscore/blob/master/underscore.js
// (c) 2009-2018 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
// Underscore may be freely distributed under the MIT license.
// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
export function throttle(func, wait, options) {
	var context, args, result;
	var timeout = null;
	var previous = 0;
	if (!options) options = {};
	var later = function () {
		previous = options.leading === false ? 0 : Date.now();
		timeout = null;
		result = func.apply(context, args);
		if (!timeout) context = args = null;
	};
	return function () {
		var now = Date.now();
		if (!previous && options.leading === false) previous = now;
		var remaining = wait - (now - previous);
		context = this;
		args = arguments;
		if (remaining <= 0 || remaining > wait) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			previous = now;
			result = func.apply(context, args);
			if (!timeout) context = args = null;
		}
		else if (!timeout && options.trailing !== false) {
			timeout = setTimeout(later, remaining);
		}
		return result;
	};
}

export function positionsEqual(p1, p2) {
	if (Array.isArray(p1.rects) !== Array.isArray(p2.rects)
		|| Array.isArray(p1.paths) !== Array.isArray(p2.paths)) {
		return false;
	}

	if (p1.pageIndex !== p2.pageIndex) {
		return false;
	}

	if (p1.rects) {
		return JSON.stringify(p1.rects) === JSON.stringify(p2.rects);
	}
	else if (p1.paths) {
		return JSON.stringify(p1.paths) === JSON.stringify(p2.paths);
	}

	return false;
}

export function getImageDataURL(img) {
	var canvas = document.createElement('canvas');
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	var ctx = canvas.getContext('2d');
	ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
	return canvas.toDataURL('image/png');
}

export function getPopupCoordinatesFromClickEvent(event) {
	let x = event.clientX;
	let y = event.clientY;

	if (event.screenX) {
		return { x: event.clientX, y: event.clientY };
	}
	else {
		let br = event.currentTarget.getBoundingClientRect();
		return { x: br.left, y: br.bottom };
	}
}

function getDragMultiIcon() {
	let node = document.getElementById('drag-multi');
	if (!node) {
		node = document.createElement('div');
		node.id = 'drag-multi';
		document.body.appendChild(node);
	}
	return node;
}

export function setMultiDragPreview(dataTransfer) {
	let icon = getDragMultiIcon();
	dataTransfer.setDragImage(icon, 0, 0);
}
