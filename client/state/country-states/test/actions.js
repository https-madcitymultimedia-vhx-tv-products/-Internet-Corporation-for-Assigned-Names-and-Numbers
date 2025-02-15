import {
	COUNTRY_STATES_RECEIVE,
	COUNTRY_STATES_REQUEST,
	COUNTRY_STATES_REQUEST_FAILURE,
	COUNTRY_STATES_REQUEST_SUCCESS,
} from 'calypso/state/action-types';
import useNock from 'calypso/test-helpers/use-nock';
import { receiveCountryStates, requestCountryStates } from '../actions';

describe( 'actions', () => {
	let spy;

	beforeEach( () => {
		spy = jest.fn();
	} );

	describe( '#receiveCountryStates()', () => {
		test( 'should return an action object', () => {
			const action = receiveCountryStates(
				[
					{ code: 'AK', name: 'Alaska' },
					{ code: 'AS', name: 'American Samoa' },
				],
				'US'
			);

			expect( action ).toEqual( {
				type: COUNTRY_STATES_RECEIVE,
				countryCode: 'us',
				countryStates: [
					{ code: 'AK', name: 'Alaska' },
					{ code: 'AS', name: 'American Samoa' },
				],
			} );
		} );
	} );

	describe( '#requestCountryStates()', () => {
		useNock( ( nock ) => {
			nock( 'https://public-api.wordpress.com:443' )
				.persist()
				.get( '/rest/v1.1/domains/supported-states/us' )
				.reply( 200, [
					{ code: 'AK', name: 'Alaska' },
					{ code: 'AS', name: 'American Samoa' },
				] )
				.get( '/rest/v1.1/domains/supported-states/ca' )
				.reply( 500, {
					error: 'server_error',
					message: 'A server error occurred',
				} );
		} );

		test( 'should dispatch fetch action when thunk triggered', () => {
			requestCountryStates( 'us' )( spy );

			expect( spy ).toBeCalledWith( {
				type: COUNTRY_STATES_REQUEST,
				countryCode: 'us',
			} );
		} );

		test( 'should dispatch country states receive action when request completes', () => {
			return requestCountryStates( 'us' )( spy ).then( () => {
				expect( spy ).toBeCalledWith( {
					type: COUNTRY_STATES_RECEIVE,
					countryCode: 'us',
					countryStates: [
						{ code: 'AK', name: 'Alaska' },
						{ code: 'AS', name: 'American Samoa' },
					],
				} );
			} );
		} );

		test( 'should dispatch country states request success action when request completes', () => {
			return requestCountryStates( 'us' )( spy ).then( () => {
				expect( spy ).toBeCalledWith( {
					type: COUNTRY_STATES_REQUEST_SUCCESS,
					countryCode: 'us',
				} );
			} );
		} );

		test( 'should dispatch fail action when request fails', () => {
			return requestCountryStates( 'ca' )( spy ).then( () => {
				expect( spy ).toBeCalledWith( {
					type: COUNTRY_STATES_REQUEST_FAILURE,
					countryCode: 'ca',
					error: expect.objectContaining( { message: 'A server error occurred' } ),
				} );
			} );
		} );
	} );
} );
