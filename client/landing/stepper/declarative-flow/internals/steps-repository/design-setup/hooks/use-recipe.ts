import { isDefaultGlobalStylesVariationSlug, isAssemblerDesign } from '@automattic/design-picker';
import { useColorPaletteVariations, useFontPairingVariations } from '@automattic/global-styles';
import { useViewportMatch } from '@wordpress/compose';
import { useDispatch, useSelect } from '@wordpress/data';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ONBOARD_STORE } from '../../../../../stores';
import type { GlobalStyles, OnboardSelect, StarterDesigns } from '@automattic/data-stores';
import type { Design, StyleVariation } from '@automattic/design-picker';
import type { GlobalStylesObject } from '@automattic/global-styles';

const useRecipe = (
	siteId = 0,
	allDesigns: StarterDesigns | undefined,
	pickDesign: ( design?: Design ) => void,
	recordPreviewDesign: ( design: Design, styleVariation?: StyleVariation ) => void,
	recordPreviewStyleVariation: ( design: Design, styleVariation?: StyleVariation ) => void
) => {
	const [ searchParams, setSearchParams ] = useSearchParams();
	const isDesktop = useViewportMatch( 'large' );
	const [ isPreviewingDesign, setIsPreviewingDesign ] = useState( false );
	const { selectedDesign, selectedStyleVariation } = useSelect( ( select ) => {
		const { getSelectedDesign, getSelectedStyleVariation } = select(
			ONBOARD_STORE
		) as OnboardSelect;
		return {
			selectedDesign: getSelectedDesign(),
			selectedStyleVariation: getSelectedStyleVariation(),
		};
	}, [] );

	const { setSelectedDesign, setSelectedStyleVariation } = useDispatch( ONBOARD_STORE );

	const [ selectedColorVariation, setSelectedColorVariation ] =
		useState< GlobalStylesObject | null >( null );

	const [ selectedFontVariation, setSelectedFontVariation ] = useState< GlobalStylesObject | null >(
		null
	);

	const numOfSelectedGlobalStyles = [
		! isDefaultGlobalStylesVariationSlug( selectedStyleVariation?.slug ),
		!! selectedColorVariation,
		!! selectedFontVariation,
	].filter( Boolean ).length;

	const [ globalStyles, setGlobalStyles ] = useState< GlobalStylesObject | null >( null );

	/**
	 * Get the preselect data only when mounting and ignore any changes later.
	 */
	const {
		preselectedTheme,
		preselectedStyle,
		preselectedColorVariationTitle,
		preselectedFontVariationTitle,
	} = useMemo(
		() => ( {
			preselectedTheme: searchParams.get( 'theme' ),
			preselectedStyle: searchParams.get( 'style_variation' ),
			preselectedColorVariationTitle: searchParams.get( 'color_variation_title' ),
			preselectedFontVariationTitle: searchParams.get( 'font_variation_title' ),
		} ),
		[]
	);

	const { stylesheet = '' } = selectedDesign?.recipe || {};

	const colorVariations = useColorPaletteVariations( siteId, stylesheet, {
		enabled: !! preselectedColorVariationTitle,
	} );

	const fontVariations = useFontPairingVariations( siteId, stylesheet, {
		enabled: !! preselectedFontVariationTitle,
	} );

	const handleSelectedDesignChange = ( design?: Design ) => {
		setSelectedDesign( design );
		setSearchParams( ( currentSearchParams ) => {
			if ( design && design.is_virtual && design.recipe?.slug ) {
				currentSearchParams.set( 'theme', design.recipe?.slug );
			} else if ( design ) {
				currentSearchParams.set( 'theme', design.slug );
			} else {
				currentSearchParams.delete( 'theme' );
			}

			return currentSearchParams;
		} );
	};

	const handleSelectedStyleVariationChange = ( variation?: StyleVariation ) => {
		setSelectedStyleVariation( variation );
		setSearchParams(
			( currentSearchParams ) => {
				if ( variation ) {
					currentSearchParams.set( 'style_variation', variation.slug );
				} else {
					currentSearchParams.delete( 'style_variation' );
				}

				return currentSearchParams;
			},
			{ replace: true }
		);
	};

	const handleSelectedColorVariationChange = ( variation: GlobalStyles | null ) => {
		setSelectedColorVariation( variation );
		setSearchParams(
			( currentSearchParams ) => {
				if ( variation && variation.title ) {
					currentSearchParams.set( 'color_variation_title', variation.title );
				} else {
					currentSearchParams.delete( 'color_variation_title' );
				}

				return currentSearchParams;
			},
			{ replace: true }
		);
	};

	const handleSelectedFontVariationChange = ( variation: GlobalStyles | null ) => {
		setSelectedFontVariation( variation );
		setSearchParams(
			( currentSearchParams ) => {
				if ( variation && variation.title ) {
					currentSearchParams.set( 'font_variation_title', variation.title );
				} else {
					currentSearchParams.delete( 'font_variation_title' );
				}

				return currentSearchParams;
			},
			{ replace: true }
		);
	};

	const previewDesign = ( design: Design, styleVariation?: StyleVariation ) => {
		// Redirect to Site Assembler if the design_type is set to "assembler".
		const shouldGoToAssembler = isDesktop && isAssemblerDesign( design );

		recordPreviewDesign( design, styleVariation );

		if ( shouldGoToAssembler ) {
			pickDesign( design );
			return;
		}

		handleSelectedDesignChange( design );
		handleSelectedStyleVariationChange( styleVariation );

		setIsPreviewingDesign( true );
	};

	const previewDesignVariation = ( variation: StyleVariation ) => {
		recordPreviewStyleVariation( selectedDesign as Design, variation );
		handleSelectedStyleVariationChange( variation );
	};

	const resetPreview = () => {
		handleSelectedDesignChange();
		handleSelectedStyleVariationChange();
		handleSelectedColorVariationChange( null );
		handleSelectedFontVariationChange( null );
		setGlobalStyles( null );
		setIsPreviewingDesign( false );
	};

	// Unset the selected design, thus restarting the design picking experience.
	useEffect( () => {
		if ( ! preselectedTheme ) {
			resetPreview();
		}
	}, [ preselectedTheme ] );

	// Initialize the preselected design and style variations.
	useEffect( () => {
		if ( ! allDesigns || ! preselectedTheme ) {
			return;
		}

		const requestedDesign = allDesigns.designs.find( ( design ) =>
			design.is_virtual
				? design.recipe?.slug === preselectedTheme
				: design.slug === preselectedTheme
		);
		if ( ! requestedDesign ) {
			return;
		}

		if ( preselectedStyle ) {
			const requestedStyleVariation = requestedDesign.style_variations?.find(
				( styleVariation ) => styleVariation.slug === preselectedStyle
			);

			setSelectedStyleVariation( requestedStyleVariation );
		}

		setSelectedDesign( requestedDesign );
		setIsPreviewingDesign( true );
	}, [
		preselectedTheme,
		preselectedStyle,
		allDesigns,
		setSelectedDesign,
		setSelectedStyleVariation,
	] );

	/**
	 * Initialize the preselected colors
	 */
	useEffect( () => {
		if ( ! colorVariations || ! preselectedColorVariationTitle ) {
			return;
		}

		const preselectedColorVariation = colorVariations.find(
			( { title } ) => title === preselectedColorVariationTitle
		);
		if ( preselectedColorVariation ) {
			setSelectedColorVariation( preselectedColorVariation );
		}
	}, [ colorVariations, preselectedColorVariationTitle ] );

	/**
	 * Initialize the preselected fonts
	 */
	useEffect( () => {
		if ( ! fontVariations || ! preselectedFontVariationTitle ) {
			return;
		}

		const preselectedFontVariation = fontVariations.find(
			( { title } ) => title === preselectedFontVariationTitle
		);
		if ( preselectedFontVariation ) {
			setSelectedFontVariation( preselectedFontVariation );
		}
	}, [ fontVariations, preselectedFontVariationTitle ] );

	return {
		isPreviewingDesign,
		selectedDesign,
		selectedStyleVariation,
		selectedColorVariation,
		selectedFontVariation,
		numOfSelectedGlobalStyles,
		globalStyles,
		previewDesign,
		previewDesignVariation,
		setSelectedDesign,
		setSelectedStyleVariation,
		setSelectedColorVariation: handleSelectedColorVariationChange,
		setSelectedFontVariation: handleSelectedFontVariationChange,
		setGlobalStyles,
		resetPreview,
	};
};

export default useRecipe;
