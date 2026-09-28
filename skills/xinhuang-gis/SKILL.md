---
name: xinhuang-gis
description: Build county-scale rural transit base maps for 新晃侗族自治县 (Xinhuang, Hunan) or similar Chinese counties from public data - OSM province extracts (download.openstreetmap.fr), Copernicus 30 m DEM, georeferencing an official administrative-division map image to digitise township polygons, routing bus lines on the OSM road graph by waypoints, hillshade, scale bar, north arrow and lon/lat graticule for academic maps; assessing user-supplied 2024 Hunan province/county/township/village boundary shapefiles and newer OSM (Geofabrik-style gis_osm_*_free_1) exports against the base map, building a village sampling frame with WorldPop population and access strata, and testing strata sensitivity to the distance definition.
---

# xinhuang-gis

Helpers in kernel.py (auto-loaded): `xh_osm_extract`, `xh_georef_affine`, `xh_road_graph`, `xh_route`,
`xh_hillshade`, `xh_map_furniture`, `xh_graticule`; `xh_read_clip`, `xh_iou`, `xh_new_length_km`, `xh_strata`, `xh_strata_sensitivity`;
constants `LOCAL_PROJ4`, `XH_BBOX`, `BASE_COLORS`.

## Data sources (public, reachable after allowlist approval)
- OSM: `https://download.openstreetmap.fr/extracts/asia/china/hunan.osm.pbf` (and `guizhou.osm.pbf`; routes to 玉屏/大龙/凉伞 cross into Guizhou, so merge both).
  Overpass-api.de rejects default client user agents (HTTP 406); do not spoof UA - use the PBF extracts.
- DEM: `https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N27_00_E10{8,9}_00_DEM/<same>.tif`.
- geoBoundaries GitHub raw files are Git-LFS pointers (not usable directly).
- OSM in Xinhuang has the county relation (r3074578) but almost no township (admin_level 8) boundaries and very few named POIs (no hospitals/schools) - treat facilities as township-seat representative points and label them so.

## Workflow
1. `xh_osm_extract(pbf, 'osm.gpkg')` for each province; concatenate and drop duplicate `osm_id`.
2. Project everything to `LOCAL_PROJ4` (TM centred 109.1E, metres).
3. Township polygons: build a binary mask of the coloured county area in the official map image
   (bright pastel pixels, exclude blue rivers `b-r>35`, open/close, keep largest component) ->
   `xh_georef_affine(mask, county_polygon)` (IoU ~0.94 for 湘S(2022)034号) -> KMeans colour classes ->
   assign each colour component to the nearest same-colour township interior seed -> fill gaps by nearest label ->
   `rasterio.features.shapes` with the fitted affine -> clip to the OSM county -> enforce contiguity
   (move detached parts to the neighbour sharing the longest boundary). Report IoU and seat residuals.
4. Routes: `G = xh_road_graph(roads_proj)`; `line, km = xh_route(G, [xy_station, xy_via..., xy_end])`; compare km with the operator/Gaode length (Xinhuang 7 lines matched within 0-13%).
5. Maps: hillshade `xh_hillshade(dem)` under a light land tint, county boundary heavy black, township boundaries grey dashed,
   then `xh_map_furniture(ax)` + `xh_graticule(ax)`; always add a source note (OSM contributors, Copernicus DEM, map approval number) and state digitisation accuracy.

## Xinhuang facts used
- 11 townships: 晃州 波洲 鱼市 凉伞 扶罗 中寨 禾滩 贡溪 林冲 步头降苗族乡 米贝苗族乡 (OSM names 步头降乡 / 米贝乡).
- Market cycles (lunar day last digit): 1/6 扶罗 波洲; 2/7 中寨 晏家 田坪 贡溪; 3/8 凉伞 禾滩 米贝 鱼市; 4/9 天堂 晃州(新晃镇) 步头降; 5/0 新寨 李树 林冲 洞坪.

## Assessing new boundary / OSM files (round five, 2026-09)
Code of record: `code_v5/gis_inventory_v5.py`, `code_v5/gis_numbers_v5.py`; report 附件G (build key `dG`).
1. Read each layer with `xh_read_clip(path, county_local)`. It filters in the file's own CRS: the 2024 Hunan village
   layer is EPSG:3857 while everything else is 4326; filtering in the wrong CRS silently returned zero villages.
2. Per file record: geometry type, CRS, features touching the county, invalid geometries, overlap share,
   then compare with the v4 base (`gis/xinhuang_base.gpkg`): boundaries by `xh_iou`, lines by `xh_new_length_km(..., buf_m=25)`.
3. Verdict per file (采用 / 部分采用 / 仅核对 / 仅制图 / 不采用) with a concrete reason, never a generic one.

Findings that should not be rediscovered:
- 湖南省行政村边界 2024: core asset. 156 polygons touch the county, 145 belong to Xinhuang, 5 invalid (repair with
  `make_valid`/`buffer(0)`); dissolving by township attribute gives 11 townships + 天雷林场 (mean IoU vs v4 townships ~0.91).
- 湖南省乡镇边界 2024: do NOT use. Pre-merger structure (33 polygons centred in county vs 11 townships),
  24 names absent from the current list, Guizhou town names (大龙镇, 邦洞镇), 7 invalid. Build townships from villages.
- 湖南省县级边界: IoU 0.976 with v4 county; the OSM county equals v4 (IoU 1.0). Check only / locator maps.
- OSM 2026-07-12 roads: beyond v4 only motorways (v4 keeps motorways as a separate layer); keep v4 road graph.
  Railways: 9.4 km of 116 km lies >25 m from v4. Bus station polygon (transport_a) replaces the v4 town
  representative point; station distances were recomputed from its centroid. Buildings cover only part of the town: unusable.
  places are mostly natural villages (few name matches with administrative villages): use them only to test
  whether village representative points sit away from settlements (they do not: median distance to road 0.72 vs 0.68 km).
- WorldPop product is `chn_ppp_2020_1km_Aggregated_UNadj.tif` (UN-ADJUSTED totals, 1 km); downscale 10x10 then sum per village.
  Use only as PPS size measure and stratification input, calibrate to village rosters in the field.

## Access strata caveat
Network distance = snap segment (representative point -> nearest graph node) + shortest path. v4 nodes are sparse
(snap median 1.4 km vs straight distance to nearest road line 0.59 km), so strata lean "farther".
`xh_strata_sensitivity({...}, 'net')`: 88% agree after removing the snap segment, 69% with straight-line distance.
For design-based sampling this only costs efficiency (inclusion probabilities stay known); for any model using distance
as a covariate, densify road nodes (~100 m) and recompute first, and report all three definitions.
