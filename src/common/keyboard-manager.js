import {
	isTextBox,
	isLinux,
	isMac,
	getKeyCombination,
	isWin,
	getCodeCombination
} from './lib/utilities';
import { ANNOTATION_COLORS } from './defines';

export class KeyboardManager {
	constructor(options) {
		this._reader = options.reader;
		window.addEventListener('keydown', this._handleKeyDown.bind(this), true);
		window.addEventListener('keyup', this._handleKeyUp.bind(this), true);
		// TODO: Possibly the current file should be renamed to input-manager if also watching pointer state
		window.addEventListener('pointerdown', this._handlePointerDown.bind(this), true);
		window.addEventListener('pointerup', this._handlePointerUp.bind(this), true);
	}

	_handleKeyUp(event, view) {
		let { key } = event;
		let ctrl = event.ctrlKey;
		let cmd = event.metaKey && isMac();
		let mod = ctrl || cmd;
		let alt = event.altKey;
		let shift = event.shiftKey;
		this.shift = shift;
		this.mod = mod;
	}

	_handleKeyDown(event, view) {
		let ctrl = event.ctrlKey;
		let cmd = event.metaKey && isMac();
		let mod = ctrl || cmd;
		let shift = event.shiftKey;

		this.shift = shift;
		this.mod = mod;

		if (event.repeat) {
			return;
		}

		let key = getKeyCombination(event);
		let code = getCodeCombination(event);

		if (!isTextBox(event.target)) {
			if (
				key === 'Cmd-['
				|| key === 'Cmd-ArrowLeft'
				|| isLinux() && key === 'Ctrl-['
				|| (isLinux() || isWin()) && key == 'Alt-ArrowLeft'
			) {
				this._reader.navigateBack();
				event.preventDefault();
				return;
			}
			if (
				key === 'Cmd-]'
				|| key === 'Cmd-ArrowRight'
				|| isLinux() && key === 'Ctrl-]'
				|| (isLinux() || isWin()) && key == 'Alt-ArrowRight'
			) {
				this._reader.navigateForward();
				event.preventDefault();
				return;
			}
		}

		// Escape must be pressed alone. We basically want to prevent
		// Option-Escape (speak text on macOS) deselecting text
		if (key === 'Escape') {
			this._reader._lastView.focus();
			this._reader.abortPrint();
			this._reader._updateState({
				selectedAnnotationIDs: [],
				labelPopup: null,
				contextMenu: null,
				tool: this._reader._tools['pointer'],
				primaryViewFindState: {
					...this._reader._state.primaryViewFindState,
					active: false,
					popupOpen: false,
				},
				secondaryViewFindState: {
					...this._reader._state.secondaryViewFindState,
					active: false,
					popupOpen: false
				}
			});
			this._reader.setFilter({
				query: '',
				colors: [],
				tags: [],
				authors: []
			});
		}

		if (['Cmd-a', 'Ctrl-a'].includes(key)) {
			// Prevent text selection if not inside a text box
			if (!isTextBox(event.target)) {
				event.preventDefault();
				// If sidebar is open and Mod-A was inside a view or sidebar, select visible annotations
				if (this._reader._state.sidebarOpen
					&& this._reader._state.sidebarView === 'annotations'
					&& (view || event.target.closest('#annotationsView'))) {
					let selectedAnnotationIDs = this._reader._state.annotations.filter(x => !x._hidden).map(x => x.id);
					this._reader._updateState({ selectedAnnotationIDs });
				}
			}
		}
		else if (['Cmd-f', 'Ctrl-f'].includes(key)) {
			event.preventDefault();
			this._reader.toggleFindPopup({ open: true });
		}
		else if (['Cmd-Shift-g', 'Ctrl-Shift-g'].includes(key)) {
			event.preventDefault();
			event.stopPropagation();
			this._reader.findPrevious();
		}
		else if (['Cmd-g', 'Ctrl-g'].includes(key)) {
			event.preventDefault();
			event.stopPropagation();
			this._reader.findNext();
		}
		else if (['Cmd-Alt-g', 'Ctrl-Alt-g'].includes(key)) {
			event.preventDefault();
			let pageNumberInput = document.getElementById('pageNumber');
			pageNumberInput.focus();
			pageNumberInput.select();
		}
		else if (['Cmd-p', 'Ctrl-p'].includes(key)) {
			event.preventDefault();
			event.stopPropagation();
			this._reader.print();
		}
		else if (['Cmd-=', 'Ctrl-='].includes(key)) {
			event.preventDefault();
			event.stopPropagation();
			this._reader.zoomIn();
		}
		else if (['Cmd--', 'Ctrl--'].includes(key)) {
			event.preventDefault();
			event.stopPropagation();
			this._reader.zoomOut();
		}
		else if (['Cmd-0', 'Ctrl-0'].includes(key) || ['Cmd-Digit0', 'Ctrl-Digit0'].includes(code)) {
			event.preventDefault();
			event.stopPropagation();
			this._reader.zoomReset();
		}
		else if (['Delete', 'Backspace'].includes(key)) {
			// Prevent the deletion of annotations when they are selected and the focus is within
			// an input or label popup. Normally, the focus should not be inside an input unless
			// it is within a label popup, which needs to indicate the annotations being modified
			if (event.target.closest('input, .label-popup')) {
				return;
			}
			let selectedIDs = this._reader._state.selectedAnnotationIDs;
			// Don't delete if some selected annotations are read-only
			let hasReadOnly = !!this._reader._state.annotations.find(x => selectedIDs.includes(x.id) && x.readOnly);
			if (hasReadOnly) {
				return;
			}
			// Allow deleting annotation from annotation comment with some exceptions
			if (selectedIDs.length === 1) {
				let annotation = this._reader._state.annotations.find(x => x.id === selectedIDs[0]);
				if (event.target.closest('.content')
					&& (
						event.target.closest('.text')
						|| annotation.comment
						|| !this._reader._enableAnnotationDeletionFromComment
					)
				) {
					return;
				}
			}
			// Focus next annotation if deleted annotations were selected not from a view
			if (selectedIDs.length >= 1 && !this._reader._annotationSelectionTriggeredFromView) {
				let { annotations } = this._reader._state;
				let firstIndex = annotations.findIndex(x => selectedIDs.includes(x.id));
				let lastIndex = annotations.findLastIndex(x => selectedIDs.includes(x.id));
				let id;
				if (lastIndex + 1 < annotations.length) {
					id = annotations[lastIndex + 1].id;
				}
				if (firstIndex - 1 >= 0) {
					id = annotations[firstIndex - 1].id;
				}
				this._reader.deleteAnnotations(this._reader._state.selectedAnnotationIDs);
				if (id) {
					let sidebarItem = document.querySelector(`[data-sidebar-annotation-id="${id}"]`);
					if (sidebarItem) {
						setTimeout(() => sidebarItem.focus());
					}
				}
			}
			else {
				this._reader.deleteAnnotations(this._reader._state.selectedAnnotationIDs);
			}
		}

		if (!isTextBox(event.target)) {
			if (code === 'Alt-Digit1') {
				this._reader.toggleTool('highlight');
			}
			else if (code === 'Alt-Digit2') {
				this._reader.toggleTool('underline');
			}
			else if (code === 'Alt-Digit3') {
				this._reader.toggleTool('note');
			}
			else if (this._reader._type === 'pdf' && code === 'Alt-Digit4') {
				this._reader.toggleTool('text');
			}
			else if (this._reader._type === 'pdf' && code === 'Alt-Digit5') {
				this._reader.toggleTool('image');
			}
			else if (this._reader._type === 'pdf' && code === 'Alt-Digit6') {
				this._reader.toggleTool('ink');
			}
			else if (this._reader._type === 'pdf' && code === 'Alt-Digit7') {
				this._reader.toggleTool('eraser');
			}
			else if ((
				this._reader._type === 'pdf' && code === 'Alt-Digit8'
				|| ['epub', 'snapshot'].includes(this._reader._type) && code === 'Alt-Digit4'
			) && this._reader._state.tool.color) {
				let idx = ANNOTATION_COLORS.findIndex(x => x[1] === this._reader._state.tool.color);
				if (idx === ANNOTATION_COLORS.length - 1) {
					idx = 0;
				}
				else {
					idx++;
				}
				this._reader.setTool({ color: ANNOTATION_COLORS[idx][1] });
			}
			else if (code.startsWith('Digit') && this._reader._state.tool.color) {
				let idx = parseInt(code.slice(5)) - 1;
				if (ANNOTATION_COLORS[idx]) {
					this._reader.setTool({ color: ANNOTATION_COLORS[idx][1] });
				}
			}
		}
	}

	_handlePointerDown(event) {
		this.pointerDown = true;

		let ctrl = event.ctrlKey;
		let cmd = event.metaKey && isMac();
		this.mod = ctrl || cmd;
		this.shift = event.shiftKey;
	}

	_handlePointerUp(event) {
		this.pointerDown = false;

		let ctrl = event.ctrlKey;
		let cmd = event.metaKey && isMac();
		this.mod = ctrl || cmd;
		this.shift = event.shiftKey;
	}

	handleViewKeyDown(event) {
		this._handleKeyDown(event, true);
	}

	handleViewKeyUp(event) {
		this._handleKeyUp(event, true);
	}
}

