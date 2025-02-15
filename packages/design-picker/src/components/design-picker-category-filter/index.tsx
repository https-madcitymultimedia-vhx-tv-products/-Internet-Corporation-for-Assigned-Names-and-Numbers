import { NavigableMenu, MenuItem, VisuallyHidden } from '@wordpress/components';
import { useInstanceId } from '@wordpress/compose';
import { useI18n } from '@wordpress/react-i18n';
import type { Category } from '../../types';
import type { ReactNode } from 'react';
import './style.scss';

interface Props {
	categories: Category[];
	onSelect: ( selectedSlug: string | null ) => void;
	selectedCategory: string | null;
	recommendedCategorySlug: string | null;
	heading?: ReactNode;
	footer?: ReactNode;
}

export function DesignPickerCategoryFilter( {
	categories,
	onSelect,
	selectedCategory,
	heading,
	footer,
	recommendedCategorySlug,
}: Props ) {
	const instanceId = useInstanceId( DesignPickerCategoryFilter );
	const { __ } = useI18n();

	return (
		<div className="design-picker-category-filter">
			{ heading }
			<VisuallyHidden as="h2" id={ `design-picker__category-heading-${ instanceId }` }>
				{ __( 'Design categories', __i18n_text_domain__ ) }
			</VisuallyHidden>

			{ /* Shown on smaller displays */ }
			<select
				className="design-picker-category-filter__dropdown"
				value={ selectedCategory || '' }
				onChange={ ( e ) => onSelect( e.currentTarget.value ) }
			>
				{ categories.map( ( { slug, name } ) => (
					<option key={ slug } value={ slug }>
						{ name }
					</option>
				) ) }
			</select>

			{ /* Shown on larger displays */ }
			<NavigableMenu
				aria-labelledby={ `design-picker__category-heading-${ instanceId }` }
				onNavigate={ ( _index, child ) => onSelect( child.dataset.slug ?? null ) }
				orientation="vertical"
				className="design-picker-category-filter__sidebar"
			>
				{ categories.map( ( { slug, name } ) => (
					<MenuItem
						key={ slug }
						isTertiary
						isPressed={ slug === selectedCategory }
						data-slug={ slug }
						onClick={ () => onSelect( slug ) }
						tabIndex={ slug === selectedCategory ? undefined : -1 }
						className="design-picker-category-filter__menu-item"
					>
						<span className="design-picker-category-filter__item-name">{ name }</span>{ ' ' }
						{ recommendedCategorySlug === slug && (
							<span className="design-picker-category-filter__recommended-badge">
								{ __( 'Recommended' ) }
							</span>
						) }
					</MenuItem>
				) ) }
			</NavigableMenu>
			{ footer }
		</div>
	);
}
