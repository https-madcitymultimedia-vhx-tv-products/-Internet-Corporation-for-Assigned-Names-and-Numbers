import { filter, size } from 'lodash';
import { getStateKey } from 'calypso/state/comments/utils';

import 'calypso/state/comments/init';

/**
 * Get total number of comments in state at a given date and time
 *
 * @param {Object} state redux state
 * @param {number} siteId site identification
 * @param {number} postId site identification
 * @param {Date} date Date to count comments for
 * @returns {number} total comments count in state
 */
export function getPostCommentsCountAtDate( state, siteId, postId, date ) {
	// Check the provided date
	if ( ! ( date instanceof Date && ! isNaN( date ) ) ) {
		return 0;
	}

	const stateKey = getStateKey( siteId, postId );
	const postComments = state.comments.items?.[ stateKey ];

	if ( ! postComments ) {
		return 0;
	}

	// Count post comments with the specified date
	const dateTimestamp = date.getTime() / 1000;
	const postCommentsAtDate = filter( postComments, ( postComment ) => {
		return Date.parse( postComment.date ) / 1000 === dateTimestamp;
	} );

	return size( postCommentsAtDate );
}
