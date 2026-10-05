import { baseApi } from './baseApi'

export interface GeoCountry {
  code: string
  name: string
  currency: string | null
}

export interface GeoProvince {
  code: string
  name: string
  type: string | null
}

export interface GeoCity {
  name: string
  provinceCode: string
}

export interface ProvinceList {
  provinces: GeoProvince[]
  /** e.g. `A1A 1A1`, for the postal code hint. */
  postalCodeExample: string
}

export interface CityList {
  cities: GeoCity[]
  /** The dataset lists no cities for this area, so any name is accepted. */
  freeText: boolean
}

export interface CityQuery {
  country: string
  province?: string
  search?: string
  limit?: number
}

interface Envelope<T> {
  success: boolean
  data: T
}

const unwrap = <T,>(response: Envelope<T>): T => response.data

/** Countries, provinces and cities never change at runtime, so they stay cached for the session. */
const STATIC = 60 * 60

export const geoApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getCountries: b.query<GeoCountry[], void>({
      query: () => '/geo/countries',
      transformResponse: unwrap,
      keepUnusedDataFor: STATIC,
    }),
    getProvinces: b.query<ProvinceList, string>({
      query: (country) => `/geo/countries/${encodeURIComponent(country)}/provinces`,
      transformResponse: unwrap,
      keepUnusedDataFor: STATIC,
    }),
    getCities: b.query<CityList, CityQuery>({
      query: ({ country, province, search, limit }) => ({
        url: `/geo/countries/${encodeURIComponent(country)}/cities`,
        params: { province: province || undefined, search: search || undefined, limit },
      }),
      transformResponse: unwrap,
      keepUnusedDataFor: STATIC,
    }),
  }),
})

export const { useGetCountriesQuery, useGetProvincesQuery, useGetCitiesQuery } = geoApi
