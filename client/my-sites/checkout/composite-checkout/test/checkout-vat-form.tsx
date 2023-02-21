/**
 * @jest-environment jsdom
 */
import { convertResponseCartToRequestCart } from '@automattic/shopping-cart';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import nock from 'nock';
import useCartKey from 'calypso/my-sites/checkout/use-cart-key';
import { isMarketplaceProduct } from 'calypso/state/products-list/selectors';
import { getDomainsBySiteId, hasLoadedSiteDomains } from 'calypso/state/sites/domains/selectors';
import { getPlansBySiteId } from 'calypso/state/sites/plans/selectors/get-plans-by-site';
import { isJetpackSite } from 'calypso/state/sites/selectors';
import {
	domainProduct,
	planWithBundledDomain,
	planWithoutDomain,
	mockSetCartEndpointWith,
	getActivePersonalPlanDataForType,
	mockCachedContactDetailsEndpoint,
	mockContactDetailsValidationEndpoint,
	getBasicCart,
	mockMatchMediaOnWindow,
	mockGetVatInfoEndpoint,
	mockSetVatInfoEndpoint,
} from './util';
import { MockCheckout } from './util/mock-checkout';
import type { CartKey } from '@automattic/shopping-cart';

jest.mock( 'calypso/state/sites/selectors' );
jest.mock( 'calypso/state/sites/domains/selectors' );
jest.mock( 'calypso/state/selectors/is-site-automated-transfer' );
jest.mock( 'calypso/state/sites/plans/selectors/get-plans-by-site' );
jest.mock( 'calypso/my-sites/checkout/use-cart-key' );
jest.mock( 'calypso/lib/analytics/utils/refresh-country-code-cookie-gdpr' );
jest.mock( 'calypso/state/products-list/selectors/is-marketplace-product' );
jest.mock( 'calypso/lib/navigate' );

describe( 'Checkout contact step', () => {
	const mainCartKey: CartKey = 'foo.com' as CartKey;
	const initialCart = getBasicCart();
	const defaultPropsForMockCheckout = {
		mainCartKey,
		initialCart,
	};

	getPlansBySiteId.mockImplementation( () => ( {
		data: getActivePersonalPlanDataForType( 'yearly' ),
	} ) );
	hasLoadedSiteDomains.mockImplementation( () => true );
	getDomainsBySiteId.mockImplementation( () => [] );
	isMarketplaceProduct.mockImplementation( () => false );
	isJetpackSite.mockImplementation( () => false );
	useCartKey.mockImplementation( () => mainCartKey );
	mockMatchMediaOnWindow();

	const mockSetCartEndpoint = mockSetCartEndpointWith( {
		currency: initialCart.currency,
		locale: initialCart.locale,
	} );

	beforeEach( () => {
		nock.cleanAll();
		nock( 'https://public-api.wordpress.com' ).persist().post( '/rest/v1.1/logstash' ).reply( 200 );
		mockGetVatInfoEndpoint( {} );
	} );

	it( 'does not render the VAT field checkbox if the selected country does not support VAT', async () => {
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );
		await user.selectOptions( await screen.findByLabelText( 'Country' ), 'US' );
		expect( screen.queryByLabelText( 'Add VAT details' ) ).not.toBeInTheDocument();
	} );

	it( 'renders the VAT field checkbox if the selected country does support VAT', async () => {
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );
		await user.selectOptions( await screen.findByLabelText( 'Country' ), 'GB' );
		expect( await screen.findByLabelText( 'Add VAT details' ) ).toBeInTheDocument();
	} );

	it( 'does not render the VAT fields if the checkbox is not checked', async () => {
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );
		await user.selectOptions( await screen.findByLabelText( 'Country' ), 'GB' );
		expect( await screen.findByLabelText( 'Add VAT details' ) ).not.toBeChecked();
		expect( screen.queryByLabelText( 'VAT Number' ) ).not.toBeInTheDocument();
	} );

	it( 'renders the VAT fields if the checkbox is checked', async () => {
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );
		await user.selectOptions( await screen.findByLabelText( 'Country' ), 'GB' );
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );
		expect( await screen.findByLabelText( 'Add VAT details' ) ).toBeChecked();
		expect( await screen.findByLabelText( 'VAT Number' ) ).toBeInTheDocument();
	} );

	it( 'does not render the Northern Ireland checkbox is if the VAT checkbox is checked and the country is EU', async () => {
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );
		await user.selectOptions( await screen.findByLabelText( 'Country' ), 'ES' );
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );
		expect( screen.queryByLabelText( 'Is the VAT for Northern Ireland?' ) ).not.toBeInTheDocument();
	} );

	it( 'renders the Northern Ireland checkbox is if the VAT checkbox is checked and the country is GB', async () => {
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );
		await user.selectOptions( await screen.findByLabelText( 'Country' ), 'GB' );
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );
		expect(
			await screen.findByLabelText( 'Is the VAT for Northern Ireland?' )
		).toBeInTheDocument();
	} );

	it( 'hides the Northern Ireland checkbox is if the VAT checkbox is checked and the country is changed from GB to ES', async () => {
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );
		await user.selectOptions( await screen.findByLabelText( 'Country' ), 'GB' );
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );
		expect(
			await screen.findByLabelText( 'Is the VAT for Northern Ireland?' )
		).toBeInTheDocument();
		await user.selectOptions( await screen.findByLabelText( 'Country' ), 'ES' );
		expect( screen.queryByLabelText( 'Is the VAT for Northern Ireland?' ) ).not.toBeInTheDocument();
	} );

	it( 'renders the VAT fields and checks the box on load if the VAT endpoint returns data', async () => {
		nock.cleanAll();
		mockCachedContactDetailsEndpoint( {
			country_code: 'GB',
			postal_code: '',
		} );
		mockContactDetailsValidationEndpoint( 'tax', { success: false, messages: [ 'Invalid' ] } );
		mockGetVatInfoEndpoint( {
			id: '12345',
			name: 'Test company',
			address: '123 Main Street',
			country: 'GB',
		} );
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );

		// Wait for checkout to load.
		await screen.findByLabelText( 'Continue with the entered contact details' );
		const countryField = await screen.findByLabelText( 'Country' );

		expect( countryField.selectedOptions[ 0 ].value ).toBe( 'GB' );
		expect( await screen.findByLabelText( 'Add VAT details' ) ).toBeChecked();
		expect( await screen.findByLabelText( 'VAT Number' ) ).toBeInTheDocument();
	} );

	it( 'renders the VAT fields pre-filled if the VAT endpoint returns data', async () => {
		nock.cleanAll();
		mockCachedContactDetailsEndpoint( {
			country_code: 'GB',
			postal_code: '',
		} );
		mockContactDetailsValidationEndpoint( 'tax', { success: false, messages: [ 'Invalid' ] } );
		mockGetVatInfoEndpoint( {
			id: '12345',
			name: 'Test company',
			address: '123 Main Street',
			country: 'GB',
		} );
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );

		// Wait for checkout to load.
		await screen.findByLabelText( 'Continue with the entered contact details' );
		const countryField = await screen.findByLabelText( 'Country' );

		expect( countryField.selectedOptions[ 0 ].value ).toBe( 'GB' );
		expect( await screen.findByLabelText( 'VAT Number' ) ).toHaveValue( '12345' );
		expect( await screen.findByLabelText( 'Organization for VAT' ) ).toHaveValue( 'Test company' );
		expect( await screen.findByLabelText( 'Address for VAT' ) ).toHaveValue( '123 Main Street' );
	} );

	it( 'does not allow unchecking the VAT details checkbox if the VAT fields are pre-filled', async () => {
		nock.cleanAll();
		mockCachedContactDetailsEndpoint( {
			country_code: 'GB',
			postal_code: '',
		} );
		mockContactDetailsValidationEndpoint( 'tax', { success: false, messages: [ 'Invalid' ] } );
		mockGetVatInfoEndpoint( {
			id: '12345',
			name: 'Test company',
			address: '123 Main Street',
			country: 'GB',
		} );
		const cartChanges = { products: [ planWithoutDomain ] };
		const user = userEvent.setup();
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );

		// Wait for checkout to load.
		await screen.findByLabelText( 'Continue with the entered contact details' );
		const countryField = await screen.findByLabelText( 'Country' );

		expect( countryField.selectedOptions[ 0 ].value ).toBe( 'GB' );
		expect( await screen.findByLabelText( 'Add VAT details' ) ).toBeChecked();
		expect( await screen.findByLabelText( 'Add VAT details' ) ).toBeDisabled();

		// Try to click it anyway and make sure it does not change.
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );
		expect( await screen.findByLabelText( 'Add VAT details' ) ).toBeChecked();
		expect( await screen.findByLabelText( 'VAT Number' ) ).toBeInTheDocument();
	} );

	it( 'sends data to the VAT endpoint when completing the step if the box is checked', async () => {
		const vatId = '12345';
		const vatName = 'Test company';
		const vatAddress = '123 Main Street';
		const countryCode = 'GB';
		const mockVatEndpoint = mockSetVatInfoEndpoint();
		mockContactDetailsValidationEndpoint( 'tax', { success: true } );
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );

		// Wait for the cart to load
		await screen.findByLabelText( 'Continue with the entered contact details' );

		await user.selectOptions( await screen.findByLabelText( 'Country' ), countryCode );
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );
		await user.type( await screen.findByLabelText( 'VAT Number' ), vatId );
		await user.type( await screen.findByLabelText( 'Organization for VAT' ), vatName );
		await user.type( await screen.findByLabelText( 'Address for VAT' ), vatAddress );
		await user.click( screen.getByText( 'Continue' ) );
		expect( await screen.findByTestId( 'payment-method-step--visible' ) ).toBeInTheDocument();
		expect( mockVatEndpoint ).toHaveBeenCalledWith( {
			id: vatId,
			name: vatName,
			country: countryCode,
			address: vatAddress,
		} );
	} );

	it( 'when there is a cached contact country that differs from the cached VAT country, the contact country is sent to the VAT endpoint', async () => {
		nock.cleanAll();
		const cachedContactCountry = 'ES';
		mockCachedContactDetailsEndpoint( {
			country_code: cachedContactCountry,
			postal_code: '',
		} );
		mockContactDetailsValidationEndpoint( 'tax', { success: false, messages: [ 'Invalid' ] } );
		const vatId = '12345';
		const vatName = 'Test company';
		const vatAddress = '123 Main Street';
		const countryCode = 'GB';
		mockGetVatInfoEndpoint( {
			id: vatId,
			name: vatName,
			address: vatAddress,
			country: countryCode,
		} );
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );

		// Wait for the cart to load
		await screen.findByLabelText( 'Continue with the entered contact details' );
		const countryField = await screen.findByLabelText( 'Country' );

		// Make sure the form has the autocompleted data.
		expect( countryField.selectedOptions[ 0 ].value ).toBe( cachedContactCountry );
		expect( await screen.findByLabelText( 'Add VAT details' ) ).toBeChecked();
		expect( await screen.findByLabelText( 'VAT Number' ) ).toHaveValue( vatId );
		expect( await screen.findByLabelText( 'Organization for VAT' ) ).toHaveValue( vatName );
		expect( await screen.findByLabelText( 'Address for VAT' ) ).toHaveValue( vatAddress );

		mockContactDetailsValidationEndpoint( 'tax', { success: true } );
		const mockVatEndpoint = mockSetVatInfoEndpoint();

		// Submit the form.
		await user.click( screen.getByText( 'Continue' ) );

		expect( await screen.findByTestId( 'payment-method-step--visible' ) ).toBeInTheDocument();
		expect( mockVatEndpoint ).toHaveBeenCalledWith( {
			id: vatId,
			name: vatName,
			address: vatAddress,
			country: cachedContactCountry,
		} );
	} );

	it( 'sends data to the VAT endpoint with Northern Ireland country code when completing the step if the XI box is checked', async () => {
		const vatId = '12345';
		const vatName = 'Test company';
		const vatAddress = '123 Main Street';
		const countryCode = 'GB';
		const mockVatEndpoint = mockSetVatInfoEndpoint();
		mockContactDetailsValidationEndpoint( 'tax', { success: true } );
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );
		await user.selectOptions( await screen.findByLabelText( 'Country' ), countryCode );
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );
		await user.click( await screen.findByLabelText( 'Is the VAT for Northern Ireland?' ) );
		await user.type( await screen.findByLabelText( 'VAT Number' ), vatId );
		await user.type( await screen.findByLabelText( 'Organization for VAT' ), vatName );
		await user.type( await screen.findByLabelText( 'Address for VAT' ), vatAddress );
		await user.click( screen.getByText( 'Continue' ) );
		expect( await screen.findByTestId( 'payment-method-step--visible' ) ).toBeInTheDocument();
		expect( mockVatEndpoint ).toHaveBeenCalledWith( {
			id: vatId,
			name: vatName,
			address: vatAddress,
			country: 'XI',
		} );
	} );

	it( 'does not send data to the VAT endpoint when completing the step if the box is not checked', async () => {
		const vatId = '12345';
		const vatName = 'Test company';
		const vatAddress = '123 Main Street';
		const countryCode = 'GB';
		const mockVatEndpoint = mockSetVatInfoEndpoint();
		mockContactDetailsValidationEndpoint( 'tax', { success: true } );
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );
		await user.selectOptions( await screen.findByLabelText( 'Country' ), countryCode );
		// Check the box
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );

		// Fill in the details
		await user.type( await screen.findByLabelText( 'VAT Number' ), vatId );
		await user.type( await screen.findByLabelText( 'Organization for VAT' ), vatName );
		await user.type( await screen.findByLabelText( 'Address for VAT' ), vatAddress );

		// Uncheck the box
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );

		await user.click( screen.getByText( 'Continue' ) );
		expect( await screen.findByTestId( 'payment-method-step--visible' ) ).toBeInTheDocument();
		expect( mockVatEndpoint ).not.toHaveBeenCalled();
	} );

	it( 'sends VAT data to the shopping-cart endpoint when completing the step if the box is checked', async () => {
		const vatId = '12345';
		const vatName = 'Test company';
		const vatAddress = '123 Main Street';
		const countryCode = 'GB';
		const postalCode = 'NW1 4NP';
		mockSetVatInfoEndpoint();
		mockContactDetailsValidationEndpoint( 'tax', { success: true } );
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };

		const setCart = jest.fn().mockImplementation( mockSetCartEndpoint );

		render(
			<MockCheckout
				{ ...defaultPropsForMockCheckout }
				cartChanges={ cartChanges }
				setCart={ setCart }
			/>
		);
		await user.selectOptions( await screen.findByLabelText( 'Country' ), countryCode );
		await user.type( await screen.findByLabelText( 'Postal code' ), postalCode );
		// Check the box
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );

		// Fill in the details
		await user.type( await screen.findByLabelText( 'VAT Number' ), vatId );
		await user.type( await screen.findByLabelText( 'Organization for VAT' ), vatName );
		await user.type( await screen.findByLabelText( 'Address for VAT' ), vatAddress );

		await user.click( screen.getByText( 'Continue' ) );
		expect( await screen.findByTestId( 'payment-method-step--visible' ) ).toBeInTheDocument();
		expect( setCart ).toHaveBeenCalledWith(
			mainCartKey,
			convertResponseCartToRequestCart( {
				...initialCart,
				...cartChanges,
				tax: {
					display_taxes: true,
					location: {
						country_code: countryCode,
						postal_code: postalCode,
						subdivision_code: undefined,
						vat_id: vatId,
						organization: vatName,
						address: vatAddress,
					},
				},
			} )
		);
	} );

	it( 'does not send VAT data to the shopping-cart endpoint when completing the step if the box is not checked', async () => {
		const vatId = '12345';
		const vatName = 'Test company';
		const vatAddress = '123 Main Street';
		const countryCode = 'GB';
		const postalCode = 'NW1 4NP';
		mockSetVatInfoEndpoint();
		mockContactDetailsValidationEndpoint( 'tax', { success: true } );
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };

		const setCart = jest.fn().mockImplementation( mockSetCartEndpoint );

		render(
			<MockCheckout
				{ ...defaultPropsForMockCheckout }
				cartChanges={ cartChanges }
				setCart={ setCart }
			/>
		);
		await user.selectOptions( await screen.findByLabelText( 'Country' ), countryCode );
		await user.type( await screen.findByLabelText( 'Postal code' ), postalCode );
		// Check the box
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );

		// Fill in the details
		await user.type( await screen.findByLabelText( 'VAT Number' ), vatId );
		await user.type( await screen.findByLabelText( 'Organization for VAT' ), vatName );
		await user.type( await screen.findByLabelText( 'Address for VAT' ), vatAddress );

		// Uncheck the box
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );

		await user.click( screen.getByText( 'Continue' ) );
		expect( await screen.findByTestId( 'payment-method-step--visible' ) ).toBeInTheDocument();
		expect( setCart ).toHaveBeenCalledWith(
			mainCartKey,
			convertResponseCartToRequestCart( {
				...initialCart,
				...cartChanges,
				tax: {
					display_taxes: true,
					location: { country_code: countryCode, postal_code: postalCode },
				},
			} )
		);
	} );

	it( 'does not send VAT data to the shopping-cart endpoint when completing the step if the box is checked but the country no longer supports VAT', async () => {
		const vatId = '12345';
		const vatName = 'Test company';
		const vatAddress = '123 Main Street';
		const countryCode = 'GB';
		const nonVatCountryCode = 'US';
		const postalCode = 'NW1 4NP';
		mockSetVatInfoEndpoint();
		mockContactDetailsValidationEndpoint( 'tax', { success: true } );
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };

		const setCart = jest.fn().mockImplementation( mockSetCartEndpoint );

		render(
			<MockCheckout
				{ ...defaultPropsForMockCheckout }
				cartChanges={ cartChanges }
				setCart={ setCart }
			/>
		);
		await user.selectOptions( await screen.findByLabelText( 'Country' ), countryCode );
		await user.type( await screen.findByLabelText( 'Postal code' ), postalCode );
		// Check the box
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );

		// Fill in the details
		await user.type( await screen.findByLabelText( 'VAT Number' ), vatId );
		await user.type( await screen.findByLabelText( 'Organization for VAT' ), vatName );
		await user.type( await screen.findByLabelText( 'Address for VAT' ), vatAddress );

		// Change the country to one that does not support VAT
		await user.selectOptions( await screen.findByLabelText( 'Country' ), nonVatCountryCode );

		await user.click( screen.getByText( 'Continue' ) );
		expect( await screen.findByTestId( 'payment-method-step--visible' ) ).toBeInTheDocument();
		expect( setCart ).toHaveBeenCalledWith(
			mainCartKey,
			convertResponseCartToRequestCart( {
				...initialCart,
				...cartChanges,
				tax: {
					display_taxes: true,
					location: { country_code: nonVatCountryCode, postal_code: postalCode },
				},
			} )
		);
	} );

	it( 'does not complete the step if the VAT endpoint returns an error', async () => {
		const vatId = '12345';
		const vatName = 'Test company';
		const vatAddress = '123 Main Street';
		const countryCode = 'GB';
		nock( 'https://public-api.wordpress.com' ).post( '/rest/v1.1/me/vat-info' ).reply( 400 );
		mockContactDetailsValidationEndpoint( 'tax', { success: true } );
		const user = userEvent.setup();
		const cartChanges = { products: [ planWithoutDomain ] };
		render( <MockCheckout { ...defaultPropsForMockCheckout } cartChanges={ cartChanges } /> );
		await user.selectOptions( await screen.findByLabelText( 'Country' ), countryCode );
		await user.click( await screen.findByLabelText( 'Add VAT details' ) );
		await user.type( await screen.findByLabelText( 'VAT Number' ), vatId );
		await user.type( await screen.findByLabelText( 'Organization for VAT' ), vatName );
		await user.type( await screen.findByLabelText( 'Address for VAT' ), vatAddress );
		await user.click( screen.getByText( 'Continue' ) );
		await expect( screen.findByTestId( 'payment-method-step--visible' ) ).toNeverAppear();
	} );

	it.each( [
		{
			tax: {
				country_code: 'CA',
				city: 'Montreal',
				subdivision_code: 'QC',
				postal_code: 'A1A 1A1',
			},
			labels: { subdivision_code: 'Province' },
			product: 'plan',
			expect: 'city and province',
		},
		{
			tax: { country_code: 'CA', city: 'Montreal', subdivision_code: 'QC', postal_code: 'A1A 1A1' },
			labels: { subdivision_code: 'Province' },
			product: 'plan with domain',
			expect: 'city and province',
		},
		{
			tax: { country_code: 'IN', subdivision_code: 'KA', postal_code: '123 456' },
			product: 'plan',
			expect: 'state',
		},
		{
			tax: { country_code: 'IN', subdivision_code: 'KA', postal_code: '123 456' },
			product: 'plan with domain',
			expect: 'state',
		},
		{
			tax: { country_code: 'JP', organization: 'JP Organization', postal_code: '123-4567' },
			product: 'plan',
			expect: 'organization',
		},
		{
			tax: { country_code: 'JP', organization: 'JP Organization', postal_code: '123-4567' },
			product: 'plan with domain',
			expect: 'organization',
		},
		{
			tax: {
				country_code: 'NO',
				organization: 'NO Organization',
				city: 'Oslo',
				postal_code: '1234',
			},
			product: 'plan',
			expect: 'city and organization',
		},
		{
			tax: {
				country_code: 'NO',
				organization: 'NO Organization',
				city: 'Oslo',
				postal_code: '1234',
			},
			product: 'plan with domain',
			expect: 'city and organization',
		},
	] )(
		'sends additional tax data with $expect to the shopping-cart endpoint when a country with those requirements has been chosen and a $product is in the cart',
		async ( {
			tax,
			labels,
			product,
		}: {
			tax: Record< string, string >;
			labels?: Record< string, string >;
			product: string;
		} ) => {
			const selects = { country_code: true, subdivision_code: true };
			labels = {
				city: 'City',
				subdivision_code: 'State',
				organization: 'Organization',
				postal_code: product === 'plan' ? 'Postal code' : 'Postal Code',
				country_code: 'Country',
				...labels,
			};
			mockContactDetailsValidationEndpoint( product === 'plan' ? 'tax' : 'domain', {
				success: true,
			} );
			const user = userEvent.setup();
			const cartChanges =
				product === 'plan'
					? { products: [ planWithoutDomain ] }
					: { products: [ planWithBundledDomain, domainProduct ] };

			const setCart = jest.fn().mockImplementation( mockSetCartEndpoint );

			render(
				<MockCheckout
					{ ...defaultPropsForMockCheckout }
					cartChanges={ cartChanges }
					setCart={ setCart }
				/>
			);
			for ( const key of Object.keys( tax ) ) {
				if ( selects[ key ] ) {
					await user.selectOptions( await screen.findByLabelText( labels[ key ] ), tax[ key ] );
				} else {
					await user.type( await screen.findByLabelText( labels[ key ] ), tax[ key ] );
				}
			}

			await user.click( screen.getByText( 'Continue' ) );
			expect( await screen.findByTestId( 'payment-method-step--visible' ) ).toBeInTheDocument();
			expect( setCart ).toHaveBeenCalledWith(
				mainCartKey,
				convertResponseCartToRequestCart( {
					...initialCart,
					...cartChanges,
					tax: {
						display_taxes: true,
						location: tax,
					},
				} )
			);
		}
	);

	it.each( [
		{ vatOrganization: 'with', product: 'plan' },
		{ vatOrganization: 'without', product: 'plan' },
		{ vatOrganization: 'with', product: 'plan with domain' },
		{ vatOrganization: 'without', product: 'plan with domain' },
	] )(
		'sends both contact details and tax data to the shopping cart endpoint when a plan with domain is in the cart and VAT details have been added $vatOrganization VAT organization',
		async ( { vatOrganization, product } ) => {
			const vatId = '12345';
			const vatName = vatOrganization === 'with' ? 'VAT Organization' : 'Contact Organization';
			const vatAddress = '123 Main Street';
			const countryCode = 'GB';
			const postalCode = 'NW1 4NP';
			mockSetVatInfoEndpoint();
			mockContactDetailsValidationEndpoint( product === 'plan' ? 'tax' : 'domain', {
				success: true,
			} );
			const user = userEvent.setup();
			const cartChanges =
				product === 'plan'
					? { products: [ planWithoutDomain ] }
					: { products: [ planWithBundledDomain, domainProduct ] };

			const setCart = jest.fn().mockImplementation( mockSetCartEndpoint );

			render(
				<MockCheckout
					{ ...defaultPropsForMockCheckout }
					cartChanges={ cartChanges }
					setCart={ setCart }
				/>
			);
			await user.selectOptions( await screen.findByLabelText( 'Country' ), countryCode );
			await user.type(
				await screen.findByLabelText( product === 'plan' ? 'Postal code' : 'Postal Code' ),
				postalCode
			);
			await user.type( await screen.findByLabelText( 'Organization' ), 'Contact Organization' );

			// Check the box
			await user.click( await screen.findByLabelText( 'Add VAT details' ) );

			// Fill in the details
			await user.type( await screen.findByLabelText( 'VAT Number' ), vatId );
			if ( vatOrganization === 'with' ) {
				await user.type( await screen.findByLabelText( 'Organization for VAT' ), vatName );
			}
			await user.type( await screen.findByLabelText( 'Address for VAT' ), vatAddress );

			await user.click( screen.getByText( 'Continue' ) );
			expect( await screen.findByTestId( 'payment-method-step--visible' ) ).toBeInTheDocument();
			expect( setCart ).toHaveBeenCalledWith(
				mainCartKey,
				convertResponseCartToRequestCart( {
					...initialCart,
					...cartChanges,
					tax: {
						display_taxes: true,
						location: {
							country_code: countryCode,
							postal_code: postalCode,
							vat_id: vatId,
							organization: vatName,
							address: vatAddress,
						},
					},
				} )
			);
		}
	);
} );