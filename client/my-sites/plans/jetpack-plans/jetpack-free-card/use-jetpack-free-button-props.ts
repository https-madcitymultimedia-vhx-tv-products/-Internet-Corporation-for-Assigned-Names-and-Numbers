import { PLAN_JETPACK_FREE } from '@automattic/calypso-products';
import { getUrlParts, getUrlFromParts } from '@automattic/calypso-url';
import { useCallback, useMemo } from 'react';
import { JPC_PATH_BASE } from 'calypso/jetpack-connect/constants';
import { storePlan } from 'calypso/jetpack-connect/persistence-utils';
import isJetpackCloud from 'calypso/lib/jetpack/is-jetpack-cloud';
import useTrackCallback from 'calypso/lib/jetpack/use-track-callback';
import { useSelector } from 'calypso/state';
import getJetpackRecommendationsUrl from 'calypso/state/selectors/get-jetpack-recommendations-url';
import type { QueryArgs } from 'calypso/my-sites/plans/jetpack-plans/types';

type SiteId = number | null;

interface Props {
	href: string;
	onClick: React.MouseEventHandler;
}

const buildHref = (
	wpAdminUrl: string | undefined,
	siteId: SiteId,
	urlQueryArgs: QueryArgs
): string => {
	const { site } = urlQueryArgs;

	// If the user is not logged in and there is a site in the URL, we need to construct
	// the URL to wp-admin from the `site` query parameter
	let jetpackAdminUrlFromQuery;

	if ( site ) {
		let wpAdminUrlFromQuery;

		// Ensure that URL is valid
		try {
			// Slugs of secondary sites of a multisites network follow this syntax: example.net::second-site
			wpAdminUrlFromQuery = new URL( `https://${ site.replace( /::/g, '/' ) }/wp-admin/admin.php` );
		} catch ( e ) {}

		if ( wpAdminUrlFromQuery ) {
			jetpackAdminUrlFromQuery = getUrlFromParts( {
				...getUrlParts( wpAdminUrlFromQuery.href ),
				search: '?page=jetpack',
				hash: '/recommendations',
			} ).href;
		}
	}

	// `siteId` is going to be null if the user is not logged in, so we need to check
	// if there is a site in the URL also
	const isSiteinContext = siteId || site;

	if ( isJetpackCloud() && ! isSiteinContext ) {
		return '/pricing/jetpack-free/welcome';
	}
	return wpAdminUrl || jetpackAdminUrlFromQuery || JPC_PATH_BASE;
};

export default function useJetpackFreeButtonProps(
	siteId: SiteId,
	urlQueryArgs: QueryArgs = {}
): Props {
	const recommendationsUrl = useSelector( getJetpackRecommendationsUrl );
	const siteWpAdminUrl = urlQueryArgs?.admin_url
		? getUrlFromParts( {
				...getUrlParts( urlQueryArgs.admin_url + 'admin.php' ),
				search: '?page=jetpack',
				hash: '/recommendations',
		  } ).href
		: recommendationsUrl;
	const trackCallback = useTrackCallback( undefined, 'calypso_product_jpfree_click', {
		site_id: siteId || undefined,
	} );
	const onClick = useCallback( () => {
		storePlan( PLAN_JETPACK_FREE );
		trackCallback();
	}, [ trackCallback ] );
	const href = useMemo(
		() => buildHref( siteWpAdminUrl, siteId, urlQueryArgs ),
		[ siteWpAdminUrl, siteId, urlQueryArgs ]
	);

	return {
		href,
		onClick,
	};
}
