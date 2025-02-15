import type { SiteDetails } from '@automattic/data-stores';

export enum LicenseState {
	Detached = 'detached',
	Attached = 'attached',
	Revoked = 'revoked',
}

export enum LicenseFilter {
	NotRevoked = 'not_revoked',
	Detached = 'detached',
	Attached = 'attached',
	Revoked = 'revoked',
	Standard = 'standard',
}

export enum LicenseSortField {
	IssuedAt = 'issued_at',
	AttachedAt = 'attached_at',
	RevokedAt = 'revoked_at',
}

export enum LicenseSortDirection {
	Ascending = 'asc',
	Descending = 'desc',
}

export enum LicenseType {
	Standard = 'user',
	Partner = 'jetpack_partner_key',
}

export interface AssignLicenceProps {
	selectedSite?: SiteDetails | null;
	suggestedProduct?: string;
}
