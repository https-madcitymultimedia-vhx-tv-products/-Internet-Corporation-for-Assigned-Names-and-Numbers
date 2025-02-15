import wasBusinessTrialSite from 'calypso/state/selectors/was-business-trial-site';
import wasEcommerceTrialSite from 'calypso/state/selectors/was-ecommerce-trial-site';
import { getSelectedSite } from 'calypso/state/ui/selectors';
import BusinessTrialExpired from '../trials/business-trial-expired';
import ECommerceTrialExpired from './ecommerce-trial-expired';
import TrialUpgradeConfirmation from './upgrade-confirmation';

export function trialExpired( context, next ) {
	const state = context.store.getState();
	const selectedSite = getSelectedSite( state );

	if ( wasEcommerceTrialSite( state, selectedSite.ID ) ) {
		context.primary = <ECommerceTrialExpired />;
	} else if ( wasBusinessTrialSite( state, selectedSite.ID ) ) {
		context.primary = <BusinessTrialExpired />;
	}

	next();
}

export function trialUpgradeConfirmation( context, next ) {
	context.primary = <TrialUpgradeConfirmation />;
	next();
}
