import config from '@automattic/calypso-config';
import { CheckoutErrorBoundary } from '@automattic/composite-checkout';
import i18n, { getLocaleSlug, localize, useTranslate } from 'i18n-calypso';
import page from 'page';
import { Fragment, useCallback } from 'react';
import DocumentHead from 'calypso/components/data/document-head';
import NoSitesMessage from 'calypso/components/empty-content/no-sites-message';
import FormattedHeader from 'calypso/components/formatted-header';
import HeaderCake from 'calypso/components/header-cake';
import Main from 'calypso/components/main';
import { makeLayout, render as clientRender } from 'calypso/controller';
import { useGeoLocationQuery } from 'calypso/data/geo/use-geolocation-query';
import PageViewTracker from 'calypso/lib/analytics/page-view-tracker';
import { logToLogstash } from 'calypso/lib/logstash';
import AddNewPaymentMethod from 'calypso/me/purchases/add-new-payment-method';
import ChangePaymentMethod from 'calypso/me/purchases/manage-purchase/change-payment-method';
import {
	managePurchase as managePurchaseUrl,
	purchasesRoot,
	vatDetails as vatDetailsPath,
	billingHistory,
} from 'calypso/me/purchases/paths';
import PurchasesNavigation from 'calypso/me/purchases/purchases-navigation';
import { useTaxName } from 'calypso/my-sites/checkout/composite-checkout/hooks/use-country-list';
import { convertErrorToString } from 'calypso/my-sites/checkout/composite-checkout/lib/analytics';
import { getCurrentUserSiteCount } from 'calypso/state/current-user/selectors';
import CancelPurchase from './cancel-purchase';
import ConfirmCancelDomain from './confirm-cancel-domain';
import ManagePurchase from './manage-purchase';
import { ManagePurchaseByOwnership } from './manage-purchase/manage-purchase-by-ownership';
import PurchasesList from './purchases-list';
import titles from './titles';
import VatInfoPage from './vat-info';
import useVatDetails from './vat-info/use-vat-details';

function useLogPurchasesError( message ) {
	return useCallback(
		( error ) => {
			logToLogstash( {
				feature: 'calypso_client',
				message,
				severity: config( 'env_id' ) === 'production' ? 'error' : 'debug',
				extra: {
					env: config( 'env_id' ),
					type: 'account_level_purchases',
					message: convertErrorToString( error ),
				},
			} );
		},
		[ message ]
	);
}

const PurchasesWrapper = ( { title = null, children } ) => {
	return (
		<Fragment>
			<DocumentHead title={ title } />
			{ children }
		</Fragment>
	);
};
const noop = () => {};
const userHasNoSites = ( state ) => getCurrentUserSiteCount( state ) <= 0;

function noSites( context, analyticsPath ) {
	const NoSitesWrapper = localize( () => {
		return (
			<PurchasesWrapper>
				<Main wideLayout className="purchases__no-site">
					<PageViewTracker path={ analyticsPath } title="Purchases > No Sites" />
					<PurchasesNavigation section="activeUpgrades" />
					<NoSitesMessage />
				</Main>
			</PurchasesWrapper>
		);
	} );

	context.primary = <NoSitesWrapper />;
	makeLayout( context, noop );
	clientRender( context );
}

export function addCreditCard( context, next ) {
	context.primary = <AddNewPaymentMethod />;
	next();
}

export function cancelPurchase( context, next ) {
	const CancelPurchaseWrapper = localize( () => {
		return (
			<PurchasesWrapper title={ titles.cancelPurchase }>
				<Main wideLayout className="purchases__cancel">
					<FormattedHeader brandFont headerText={ titles.sectionTitle } align="left" />
					<CancelPurchase
						purchaseId={ parseInt( context.params.purchaseId, 10 ) }
						siteSlug={ context.params.site }
					/>
				</Main>
			</PurchasesWrapper>
		);
	} );

	context.primary = <CancelPurchaseWrapper />;
	next();
}

export function confirmCancelDomain( context, next ) {
	const state = context.store.getState();

	if ( userHasNoSites( state ) ) {
		return noSites( context, '/me/purchases/:site/:purchaseId/confirm-cancel-domain' );
	}

	const ConfirmCancelDomainWrapper = localize( () => {
		return (
			<PurchasesWrapper title={ titles.confirmCancelDomain }>
				<Main wideLayout className="purchases__cancel-domain confirm-cancel-domain">
					<FormattedHeader brandFont headerText={ titles.sectionTitle } align="left" />
					<ConfirmCancelDomain
						purchaseId={ parseInt( context.params.purchaseId, 10 ) }
						siteSlug={ context.params.site }
					/>
				</Main>
			</PurchasesWrapper>
		);
	} );

	context.primary = <ConfirmCancelDomainWrapper />;
	next();
}

export function list( context, next ) {
	const ListWrapper = localize( () => {
		return (
			<PurchasesWrapper>
				<PurchasesList noticeType={ context.params.noticeType } />
			</PurchasesWrapper>
		);
	} );

	context.primary = <ListWrapper />;
	next();
}

export function vatDetails( context, next ) {
	const VatInfoWrapper = localize( () => {
		const goToBillingHistory = () => page( billingHistory );
		const classes = 'vat-details';

		const translate = useTranslate();
		const { data: geoData } = useGeoLocationQuery();
		const { vatDetails: vatDetailsFromServer } = useVatDetails();
		const taxName = useTaxName( vatDetailsFromServer.country ?? geoData?.country_short ?? 'GB' );
		const genericTaxName =
			/* translators: This is a generic name for taxes to use when we do not know the user's country. */
			translate( 'tax (VAT/GST/CT)' );
		const fallbackTaxName =
			getLocaleSlug()?.startsWith( 'en' ) || i18n.hasTranslation( 'tax (VAT/GST/CT)' )
				? genericTaxName
				: translate( 'VAT', { textOnly: true } );
		/* translators: %s is the name of taxes in the country (eg: "VAT" or "GST"). */
		const title = translate( 'Add %s details', {
			textOnly: true,
			args: [ taxName ?? fallbackTaxName ],
		} );

		return (
			<PurchasesWrapper title={ title }>
				<Main wideLayout className={ classes }>
					<PageViewTracker path={ vatDetailsPath } title="Purchases > VAT Details" />

					<FormattedHeader brandFont headerText={ titles.sectionTitle } align="left" />
					<HeaderCake onClick={ goToBillingHistory }>{ title }</HeaderCake>

					<VatInfoPage siteSlug={ context.params.site } />
				</Main>
			</PurchasesWrapper>
		);
	} );

	context.primary = <VatInfoWrapper />;
	next();
}

export function managePurchase( context, next ) {
	const ManagePurchasesWrapper = localize( () => {
		const classes = 'manage-purchase';

		return (
			<PurchasesWrapper title={ titles.managePurchase }>
				<Main wideLayout className={ classes }>
					<FormattedHeader brandFont headerText={ titles.sectionTitle } align="left" />
					<PageViewTracker
						path="/me/purchases/:site/:purchaseId"
						title="Purchases > Manage Purchase"
					/>
					<ManagePurchase
						purchaseId={ parseInt( context.params.purchaseId, 10 ) }
						siteSlug={ context.params.site }
					/>
				</Main>
			</PurchasesWrapper>
		);
	} );

	context.primary = <ManagePurchasesWrapper />;
	next();
}

export function managePurchaseByOwnership( context, next ) {
	const ManagePurchasesByOwnershipWrapper = localize( () => {
		const classes = 'manage-purchase';

		return (
			<PurchasesWrapper title={ titles.managePurchase }>
				<Main wideLayout className={ classes }>
					<FormattedHeader brandFont headerText={ titles.sectionTitle } align="left" />
					<PageViewTracker
						path="/me/purchases/:ownershipId"
						title="Purchases > Manage Purchase by Ownership"
					/>
					<ManagePurchaseByOwnership ownershipId={ parseInt( context.params.ownershipId, 10 ) } />
				</Main>
			</PurchasesWrapper>
		);
	} );

	context.primary = <ManagePurchasesByOwnershipWrapper />;
	next();
}

export function addNewPaymentMethod( context, next ) {
	context.primary = <AddNewPaymentMethod />;
	next();
}

export function changePaymentMethod( context, next ) {
	const ChangePaymentMethodWrapper = () => {
		const translate = useTranslate();
		const logPurchasesError = useLogPurchasesError(
			'account level purchases change payment method load error'
		);
		return (
			<PurchasesWrapper title={ titles.changePaymentMethod }>
				<Main wideLayout className="purchases__edit-payment-method">
					<FormattedHeader brandFont headerText={ titles.sectionTitle } align="left" />
					<CheckoutErrorBoundary
						errorMessage={ translate( 'Sorry, there was an error loading this page.' ) }
						onError={ logPurchasesError }
					>
						<ChangePaymentMethod
							purchaseId={ parseInt( context.params.purchaseId, 10 ) }
							siteSlug={ context.params.site }
							getManagePurchaseUrlFor={ managePurchaseUrl }
							purchaseListUrl={ purchasesRoot }
						/>
					</CheckoutErrorBoundary>
				</Main>
			</PurchasesWrapper>
		);
	};

	context.primary = <ChangePaymentMethodWrapper />;
	next();
}
