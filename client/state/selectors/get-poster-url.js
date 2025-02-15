import 'calypso/state/posts/init';

/**
 * Returns the poster URL of the video.
 *
 *
 * @param {Object}  state Global state tree
 * @returns {string}  URL of the poster.
 */

export default function getPosterUrl( state ) {
	return state.editor.videoEditor.url;
}
