import React, { useContext } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import cx from 'classnames';
import Editor from './editor';
import ExpandableEditor from './expandable-editor';
import { IconHighlight, IconUnderline, IconNote, IconArea, IconInk, IconText } from './icons';
import { getPopupCoordinatesFromClickEvent } from '../../lib/utilities';
import { ReaderContext } from '../../reader';

// TODO: Don't allow to select UI text in popup header and footer

// TODO: Rename to annotation-preview

export function PopupPreview(props) {
	const intl = useIntl();

	function handlePageLabelDoubleClick(event) {
		if (props.type !== 'pdf' || props.readOnly) {
			return;
		}
		let rect = event.currentTarget.querySelector('.label').getBoundingClientRect();
		rect = [
			rect.left,
			rect.top,
			rect.right,
			rect.bottom
		];
		props.onDoubleClickPageLabel(props.annotation.id, rect);
	}

	function handleTagsClick(event) {
		if (props.readOnly) {
			return;
		}
		let rect = event.target.closest('.tags').getBoundingClientRect();
		props.onOpenTagsPopup(props.annotation.id, rect.left, rect.top);
	}

	function handleCommentChange(text) {
		props.onChange({ id: props.annotation.id, comment: text, onlyTextOrComment: true });
	}

	function handleClickMore(event) {
		// Prevent selecting annotation
		event.stopPropagation();
		let { x, y } = getPopupCoordinatesFromClickEvent(event);
		props.onOpenContextMenu({ ids: [props.annotation.id], currentID: props.annotation.id, x, y, popup: true, view: true });
	}

	let { annotation, type } = props;
	return (
		<div
			className={cx('preview', { 'read-only': props.readOnly })}
		>
			<header
				title={intl.formatDate(new Date(annotation.dateModified))
					+ ' ' + intl.formatTime(new Date(annotation.dateModified))
					+ (annotation.lastModifiedByUser ? ' (' + annotation.lastModifiedByUser + ')' : '')}
			>
				<div className="left">
					<div
						className={cx('icon', 'icon-' + annotation.type)}
						style={{ color: annotation.color }}
					>
						{
							annotation.type === 'highlight' && <IconHighlight/>
							|| annotation.type === 'underline' && <IconUnderline/>
							|| annotation.type === 'note' && <IconNote/>
							|| annotation.type === 'image' && <IconArea/>
							|| annotation.type === 'ink' && <IconInk/>
							|| annotation.type === 'text' && <IconText/>
						}
					</div>
					{annotation.pageLabel && (
						<div className="page" onDoubleClick={handlePageLabelDoubleClick}>
							<div><FormattedMessage id="pdfReader.page"/></div>
							<div className="label">{annotation.pageLabel}</div>
						</div>
					)}
				</div>
				<div className="right">
					{annotation.authorName && (
						<div className={cx('author', { 'non-authoritative': !annotation.isAuthorNameAuthoritative })}>
							{annotation.authorName}
						</div>
					)}
					<button
						data-tabstop={!props.readOnly ? true : undefined}
						tabIndex={-1}
						className="more"
						disabled={props.readOnly}
						onClick={handleClickMore}
					/>
				</div>
			</header>

			{!['ink', 'text'].includes(annotation.type) && (
				<div className="comment">
					<Editor
						id={annotation.id}
						text={annotation.comment}
						placeholder={props.readOnly ? intl.formatMessage({ id: 'pdfReader.readOnly' })
							: intl.formatMessage({ id: 'pdfReader.addComment' })}
						readOnly={props.readOnly}
						enableRichText={annotation.type !== 'text'}
						onChange={handleCommentChange}
					/>
				</div>
			)}

			{(!props.readOnly || !!annotation.tags.length) && (
				<button
					className="tags"
					data-tabstop={1}
					onClick={handleTagsClick}
				>{annotation.tags.length ? annotation.tags.map((tag, index) => (
					<span
						className="tag" key={index}
						style={{ color: tag.color }}
					>{tag.name}</span>
				)) : <FormattedMessage id="pdfReader.addTags"/>}</button>
			)}

		</div>
	);

}

export function SidebarPreview(props) {
	const intl = useIntl();
	const { platform } = useContext(ReaderContext);

	function handlePageLabelClick(event) {
		event.stopPropagation();
	}

	function handlePageLabelDoubleClick(event) {
		if (props.type !== 'pdf' || props.readOnly) {
			return;
		}
		let rect = event.currentTarget.querySelector('.label').getBoundingClientRect();
		rect = [
			rect.left,
			rect.top,
			rect.right,
			rect.bottom
		];
		props.onDoubleClickPageLabel(props.annotation.id, rect);
	}

	function handleSectionClick(event, section) {
		props.onClickSection(props.annotation.id, section, event);
	}

	function handleTextChange(text) {
		props.onChange({ id: props.annotation.id, text, onlyTextOrComment: true });
	}

	function handleCommentChange(text) {
		props.onChange({ id: props.annotation.id, comment: text, onlyTextOrComment: true });
	}

	function handleClickMore(event) {
		// Prevent selecting annotation
		event.stopPropagation();
		let { x, y } = getPopupCoordinatesFromClickEvent(event);
		props.onOpenContextMenu({ ids: [props.annotation.id], currentID: props.annotation.id, x, y, button: true });
	}

	function handleDragStart(event) {
		if (!event.target.getAttribute('draggable')) {
			return;
		}

		let target = event.target.closest('.preview');

		let br = target.getBoundingClientRect();
		let offsetX = event.clientX - br.left;
		let offsetY = event.clientY - br.top;

		let x = offsetX;
		let y = offsetY;

		event.dataTransfer.setDragImage(event.target.closest('.annotation'), x, y);

		props.onSetDataTransferAnnotations(event.dataTransfer, props.annotation);
	}

	function handleEditorBlur() {
		props.onEditorBlur(props.annotation.id);
	}

	function handleTextDoubleClick() {
		props.onDoubleClickText(props.annotation.id);
	}

	function handleContextMenu(event) {
		let editorNode = event.target.closest('div[contenteditable="true"]');
		if (platform !== 'web' && event.button === 2 && (!editorNode || document.activeElement !== editorNode)) {
			event.stopPropagation();
			event.preventDefault();
			props.onOpenContextMenu({ ids: [props.annotation.id], currentID: props.annotation.id, x: event.clientX, y: event.clientY });
			return false;
		}
	}

	let { annotation, state, type } = props;

	let text = ['highlight', 'underline'].includes(annotation.type) && (
		<div
			className="annotation-text"
			onClick={e => handleSectionClick(e, 'annotation-text')}
			onDoubleClick={handleTextDoubleClick}
			draggable={state !== 3 || props.readOnly}
			onDragStart={handleDragStart}
		>
			<div className="blockquote-border" style={{ backgroundColor: annotation.color }}/>
			<ExpandableEditor
				id={annotation.id}
				text={annotation.text}
				placeholder={intl.formatMessage({ id: 'pdfReader.noExtractedText' })}
				readOnly={props.readOnly || state !== 3}
				expanded={props.state >= 2}
				enableRichText={annotation.type !== 'text'}
				onChange={handleTextChange}
			/>
		</div>
	);

	let comment = (state >= 1 || annotation.comment)
		&& annotation.type !== 'ink'
		&& !(props.readOnly && !annotation.comment)
		&& <div
			className="comment"
			onClick={e => handleSectionClick(e, 'comment')}
			draggable={state === 0 || props.readOnly}
			onDragStart={handleDragStart}
		>
			<ExpandableEditor
				id={annotation.id}
				text={annotation.comment}
				readOnly={props.readOnly || !(state === 1 || state === 2 || state === 3)}
				expanded={state >= 1}
				placeholder={intl.formatMessage({ id: 'pdfReader.addComment' })}
				enableRichText={annotation.type !== 'text'}
				onChange={handleCommentChange}
			/>
		</div>;

	let tags = annotation.tags.length ? annotation.tags.map((tag, index) => (
		<span
			className="tag" key={index}
			style={{ color: tag.color }}
		>{tag.name}</span>
	)) : <FormattedMessage id="pdfReader.addTags"/>;

	let expandedState = {};
	expandedState['expanded' + props.state] = true;

	return (
		<div
			onContextMenu={handleContextMenu}
			className={cx('preview', {
				'read-only': props.readOnly, ...expandedState
			})}
		>
			<header
				title={intl.formatDate(new Date(annotation.dateModified))
					+ ' ' + intl.formatTime(new Date(annotation.dateModified))
					+ (annotation.lastModifiedByUser ? ' (' + annotation.lastModifiedByUser + ')' : '')}
				onClick={e => handleSectionClick(e, 'header')}
				draggable={true}
				onDragStart={handleDragStart}
			>
				<div className="left">
					<div
						className={cx('icon', 'icon-' + annotation.type)}
						style={{ color: annotation.color }}
					>
						{
							annotation.type === 'highlight' && <IconHighlight/>
							|| annotation.type === 'underline' && <IconUnderline/>
							|| annotation.type === 'note' && <IconNote/>
							|| annotation.type === 'image' && <IconArea/>
							|| annotation.type === 'ink' && <IconInk/>
							|| annotation.type === 'text' && <IconText/>
						}
					</div>
					{annotation.pageLabel && (
						<div
							className="page"
							onClick={handlePageLabelClick}
							onDoubleClick={handlePageLabelDoubleClick}
						>
							<div><FormattedMessage id="pdfReader.page"/></div>
							<div className="label">{annotation.pageLabel}</div>
						</div>
					)}
				</div>
				<div className="right">
					{annotation.authorName && (
						<div className={cx('author', { 'non-authoritative': !annotation.isAuthorNameAuthoritative })}>
							{annotation.authorName}
						</div>
					)}
					<button
						data-tabstop={props.selected && !props.readOnly ? 1 : undefined}
						tabIndex={props.selected && !props.readOnly ? -1 : undefined}
						className="more"
						disabled={props.readOnly}
						onClick={handleClickMore}
						// Make sure 'more' button focusing never triggers annotation element focusing,
						// which triggers annotation selection
						onFocus={e => e.stopPropagation()}
					/>
				</div>
			</header>
			{annotation.image && (
				<img
					className="image"
					src={annotation.image}
					onClick={e => handleSectionClick(e, 'image')}
					draggable={true}
					onDragStart={handleDragStart}
				/>
			)}
			{text}
			{comment}
			{(state >= 1 && !props.readOnly || annotation.tags.length > 0)
			&& (
				<button
					className="tags"
					data-tabstop={props.selected && !props.readOnly ? 1 : undefined}
					onClick={e => handleSectionClick(e, 'tags')}
					draggable={true}
					onDragStart={handleDragStart}
				>{tags}</button>
			)}
		</div>
	);
}

