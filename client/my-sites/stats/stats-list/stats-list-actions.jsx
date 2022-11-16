import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import titlecase from 'to-title-case';
import Follow from './action-follow';
import OpenLink from './action-link';
import Page from './action-page';
import Promote from './action-promote';
import Spam from './action-spam';

/**
 * Render a list of `action` icons based on action array from a list item.
 * Possible types: External Link redirect, Specific page statistics redirect, Spam, Promote, Follow.
 * If `data` is not provided, renders `children`.
 */
const StatsListActions = ( { data, moduleName, children } ) => {
	const actionClassSet = classNames( 'stats-list-actions', 'module-content-list-item-actions' );
	const actionItems = [];

	if ( data?.actions ) {
		const moduleNameTitle = titlecase( moduleName );

		data.actions.forEach( ( action ) => {
			let actionItem;

			switch ( action.type ) {
				case 'follow':
					if ( action.data ) {
						actionItem = (
							<Follow
								key={ action.type }
								moduleName={ moduleNameTitle }
								isFollowing={ !! action.data.is_following }
								siteId={ action.data.blog_id }
							/>
						);
					}
					break;
				case 'page':
					actionItem = (
						<Page page={ action.page } key={ action.type } moduleName={ moduleNameTitle } />
					);
					break;
				case 'spam':
					actionItem = (
						<Spam
							data={ action.data }
							inHorizontalBarList
							key={ action.type }
							moduleName={ moduleNameTitle }
						/>
					);
					break;
				case 'link':
					actionItem = (
						<OpenLink href={ action.data } key={ action.type } moduleName={ moduleNameTitle } />
					);
					break;
			}

			if ( actionItem ) {
				actionItems.push( actionItem );
			}
		} );

		if ( moduleName === 'posts' && data.public ) {
			actionItems.push(
				<Promote
					postId={ data.id }
					key={ 'promote-post-' + data.id }
					moduleName={ moduleNameTitle }
					onToggleVisibility={ () => {} } // obsolete function that was blocking a general onClick handler from publishing unrelated GA events
				/>
			);
		}
	}

	return actionItems?.length || children ? (
		// prevent actions from triggering row click handler and redirect
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
		<ul className={ actionClassSet } onClick={ ( e ) => e.stopPropagation() }>
			{ !! children && children }
			{ !! actionItems?.length && actionItems }
		</ul>
	) : null;
};

StatsListActions.propTypes = {
	data: PropTypes.object,
	moduleName: PropTypes.string,
	children: PropTypes.node,
};

export default StatsListActions;
