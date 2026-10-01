import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import type {
	ListingFilterControlKey,
	ListingFilterValues,
} from "./listing-filter-contract";

export function ListingFilterForm({
	action,
	keys,
	values,
}: {
	action: string;
	keys: readonly ListingFilterControlKey[];
	values: ListingFilterValues;
}) {
	const enabled = new Set(keys);
	return (
		<form
			action={action}
			method="get"
			className="mb-8 grid gap-3 rounded-md border border-border bg-surface-subtle p-4 md:grid-cols-2 xl:grid-cols-4"
			aria-label="Фильтры каталога"
		>
			{enabled.has("rooms") ? (
				<label className="text-label" htmlFor="catalog-filter-rooms">
					Комнаты
					<Input
						id="catalog-filter-rooms"
						name="rooms"
						defaultValue={values.rooms?.join(",") ?? ""}
					/>
				</label>
			) : null}
			{enabled.has("district") ? (
				<label className="text-label" htmlFor="catalog-filter-district">
					Район
					<Input
						id="catalog-filter-district"
						name="district"
						defaultValue={values.district ?? ""}
					/>
				</label>
			) : null}
			{enabled.has("price") ? (
				<>
					<label className="text-label" htmlFor="catalog-filter-price-from">
						Цена от
						<Input
							id="catalog-filter-price-from"
							name="priceFrom"
							type="number"
							min={1}
							defaultValue={
								values.priceFromMinor ? values.priceFromMinor / 100 : ""
							}
						/>
					</label>
					<label className="text-label" htmlFor="catalog-filter-price-to">
						Цена до
						<Input
							id="catalog-filter-price-to"
							name="priceTo"
							type="number"
							min={1}
							defaultValue={
								values.priceToMinor ? values.priceToMinor / 100 : ""
							}
						/>
					</label>
				</>
			) : null}
			{enabled.has("area") ? (
				<>
					<label className="text-label" htmlFor="catalog-filter-area-from">
						Площадь от
						<Input
							id="catalog-filter-area-from"
							name="areaFrom"
							type="number"
							min={0}
							step="any"
							defaultValue={values.areaFrom ?? ""}
						/>
					</label>
					<label className="text-label" htmlFor="catalog-filter-area-to">
						Площадь до
						<Input
							id="catalog-filter-area-to"
							name="areaTo"
							type="number"
							min={0}
							step="any"
							defaultValue={values.areaTo ?? ""}
						/>
					</label>
				</>
			) : null}
			{enabled.has("market") ? (
				<label className="text-label" htmlFor="catalog-filter-market">
					Рынок
					<Select
						id="catalog-filter-market"
						name="market"
						defaultValue={values.market ?? ""}
					>
						<option value="">Любой</option>
						<option value="secondary">Вторичная недвижимость</option>
						<option value="newbuild">Новостройки</option>
					</Select>
				</label>
			) : null}
			{enabled.has("developer") ? (
				<label className="text-label" htmlFor="catalog-filter-developer">
					Застройщик
					<Input
						id="catalog-filter-developer"
						name="developer"
						defaultValue={values.developer ?? ""}
					/>
				</label>
			) : null}
			{enabled.has("completionYear") ? (
				<label className="text-label" htmlFor="catalog-filter-completion-year">
					Год сдачи
					<Input
						id="catalog-filter-completion-year"
						name="completionYear"
						type="number"
						min={1900}
						max={2200}
						defaultValue={values.completionYear ?? ""}
					/>
				</label>
			) : null}
			<div className="flex items-end">
				<Button type="submit">Применить</Button>
			</div>
		</form>
	);
}
