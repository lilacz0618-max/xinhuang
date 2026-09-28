import json
import numpy as np

LOCAL_PROJ4 = "+proj=tmerc +lat_0=0 +lon_0=109.1 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m"
XH_BBOX = (108.55, 26.85, 109.75, 27.75)
BASE_COLORS = {"land": "#f4f1ea", "county": "#1f1f1f", "township": "#8a8a8a", "water": "#6a9fc8",
               "road_major": "#b8743f", "road_minor": "#c9b8a2", "rail": "#4d4d4d", "route": "#b2182b"}


def xh_osm_extract(pbf, out_gpkg, bbox=None):
    """Extract roads/rail/water/POI/admin inside bbox from an OSM .pbf into a GeoPackage (pyosmium)."""
    import osmium, shapely.wkb as wkb, geopandas as gpd
    W, S, E, N = bbox if bbox is not None else XH_BBOX
    fab = osmium.geom.WKBFactory(); R = {k: [] for k in ("roads", "rail", "water", "pois", "admin")}
    inb = lambda x, y: W <= x <= E and S <= y <= N
    class H(osmium.SimpleHandler):
        def node(self, n):
            t = dict(n.tags)
            if t and n.location.valid() and inb(n.location.lon, n.location.lat) and ("name" in t or "place" in t):
                R["pois"].append(dict(geometry=wkb.loads(fab.create_point(n), hex=True), osm_id="n%d" % n.id,
                                      **{k: t.get(k) for k in ("name", "place", "amenity", "railway", "highway")}))
        def way(self, w):
            t = dict(w.tags); k = "roads" if "highway" in t else "rail" if "railway" in t else "water" if "waterway" in t else None
            if k is None: return
            try: g = wkb.loads(fab.create_linestring(w), hex=True)
            except Exception: return
            if inb(g.centroid.x, g.centroid.y):
                R[k].append(dict(geometry=g, osm_id="w%d" % w.id, name=t.get("name"), ref=t.get("ref"),
                                 highway=t.get("highway"), railway=t.get("railway"), highspeed=t.get("highspeed")))
        def area(self, a):
            t = dict(a.tags)
            if t.get("boundary") != "administrative": return
            try: g = wkb.loads(fab.create_multipolygon(a), hex=True)
            except Exception: return
            b = g.bounds
            if not (b[2] < W or b[0] > E or b[3] < S or b[1] > N):
                R["admin"].append(dict(geometry=g, osm_id="r%d" % a.orig_id(), name=t.get("name"), admin_level=t.get("admin_level")))
    H().apply_file(pbf, locations=True, idx="flex_mem")
    for k, v in R.items():
        if v: gpd.GeoDataFrame(v, crs=4326).to_file(out_gpkg, layer=k, driver="GPKG")
    return {k: len(v) for k, v in R.items()}


def xh_georef_affine(mask, polygon, small=4):
    """Fit a pixel->world affine that maximises IoU between a binary image mask and a projected polygon.
    Returns (affine_params[6], iou). Use for scanned/official maps with a known outline."""
    import rasterio.features
    from affine import Affine
    from scipy import optimize
    ys, xs = np.nonzero(mask); bx = polygon.bounds
    a0 = (bx[2] - bx[0]) / (xs.max() - xs.min()); e0 = -(bx[3] - bx[1]) / (ys.max() - ys.min())
    p0 = np.array([a0, 0, bx[0] - a0 * xs.min(), 0, e0, bx[3] - e0 * ys.min()]); m = mask[::small, ::small]
    sc = np.array([a0 * .02, a0 * .02, 1500, a0 * .02, a0 * .02, 1500])
    def loss(q):
        p = p0 + q * sc; A = Affine(p[0] * small, p[1] * small, p[2], p[3] * small, p[4] * small, p[5])
        r = rasterio.features.rasterize([polygon], out_shape=m.shape, transform=A).astype(bool)
        return 1 - (r & m).sum() / (r | m).sum()
    res = optimize.minimize(loss, np.zeros(6), method="Powell", options={"maxiter": 4000, "xtol": 1e-2, "ftol": 1e-5})
    return p0 + res.x * sc, 1 - res.fun


def xh_road_graph(roads, pref_refs=None, weights=None):
    """Noded, weighted networkx graph from a projected road GeoDataFrame (columns highway, ref)."""
    import networkx as nx, shapely
    if pref_refs is None: pref_refs = {"G242", "G320", "X064", "X518", "Y935"}
    if weights is None: weights = {"trunk": 1.0, "primary": 1.0, "secondary": 1.1, "tertiary": 1.2, "unclassified": 1.4, "residential": 1.6, "track": 3.0}
    r = roads[~roads.highway.isin(["motorway", "motorway_link", "footway", "path", "steps", "cycleway", "construction"])]
    segs = list(shapely.node(shapely.MultiLineString([g for g in r.geometry if g.geom_type == "LineString"])).geoms)
    near = r.sindex.nearest([s.interpolate(.5, normalized=True) for s in segs], return_all=False)[1]
    G = nx.Graph()
    for s, j in zip(segs, near):
        row = r.iloc[j]; f = weights.get(str(row.highway).replace("_link", ""), 2.0)
        if row.ref and set(str(row.ref).split(";")) & pref_refs: f *= .8
        a, b = tuple(np.round(s.coords[0], 1)), tuple(np.round(s.coords[-1], 1))
        if not G.has_edge(a, b) or G[a][b]["w"] > s.length * f: G.add_edge(a, b, w=s.length * f, geom=s, ref=row.ref)
    return G.subgraph(max(nx.connected_components(G), key=len)).copy()


def xh_route(G, waypoints):
    """Shortest weighted path through ordered projected (x, y) waypoints. Returns (LineString, km)."""
    import networkx as nx, shapely
    from scipy.spatial import cKDTree
    nodes = np.array(list(G.nodes)); kd = cKDTree(nodes); ns = [tuple(nodes[kd.query(w)[1]]) for w in waypoints]; path = []
    for u, v in zip(ns[:-1], ns[1:]):
        p = nx.shortest_path(G, u, v, weight="w"); path += p if not path else p[1:]
    xy = []
    for a, b in zip(path[:-1], path[1:]):
        c = np.asarray(G[a][b]["geom"].coords)[:, :2]
        if np.hypot(*(c[0] - np.array(a))) > np.hypot(*(c[-1] - np.array(a))): c = c[::-1]
        xy.extend(c if not xy else c[1:])
    line = shapely.LineString(xy)
    return line, line.length / 1000


def xh_hillshade(dem, res_m=60.0, az=315.0, alt=45.0, z=1.5):
    """Lambertian hillshade (0-1) from a projected DEM array."""
    dy, dx = np.gradient(dem.astype(float) * z, res_m); slope = np.pi / 2 - np.arctan(np.hypot(dx, dy))
    aspect = np.arctan2(-dx, dy); a, h = np.radians(360 - az + 90), np.radians(alt)
    return np.clip(np.sin(h) * np.sin(slope) + np.cos(h) * np.cos(slope) * np.cos(a - aspect), 0, 1)


def xh_map_furniture(ax, km=10, loc=(0.06, 0.06), north=(0.94, 0.88), fs=7):
    """Add a segmented scale bar (projected metres) and a north arrow to a map axis."""
    from matplotlib.patches import Rectangle
    x0, x1 = ax.get_xlim(); y0, y1 = ax.get_ylim(); X = x0 + loc[0] * (x1 - x0); Y = y0 + loc[1] * (y1 - y0)
    h = (y1 - y0) * .008; seg = km * 1000 / 2
    for i in range(2):
        ax.add_patch(Rectangle((X + i * seg, Y), seg, h, fc="k" if i == 0 else "w", ec="k", lw=.5, zorder=20))
    for i, lab in enumerate([0, km // 2, km]):
        ax.text(X + i * seg, Y + 2.2 * h, str(lab), ha="center", va="bottom", fontsize=fs, zorder=20)
    ax.text(X + 2 * seg + (x1 - x0) * .012, Y + h / 2, "km", va="center", fontsize=fs, zorder=20)
    nx_, ny_ = x0 + north[0] * (x1 - x0), y0 + north[1] * (y1 - y0); L = (y1 - y0) * .06
    ax.annotate("", xy=(nx_, ny_ + L), xytext=(nx_, ny_), arrowprops=dict(arrowstyle="-|>", color="k", lw=1), zorder=20)
    ax.text(nx_, ny_ + L * 1.15, "N", ha="center", va="bottom", fontsize=fs + 1, fontweight="bold", zorder=20)


def xh_graticule(ax, crs_proj4=None, step=0.1, fs=6):
    """Draw lon/lat tick labels on a projected axis (outer frame ticks only)."""
    import pyproj
    if crs_proj4 is None: crs_proj4 = LOCAL_PROJ4
    to_ll = pyproj.Transformer.from_crs(crs_proj4, 4326, always_xy=True); to_p = pyproj.Transformer.from_crs(4326, crs_proj4, always_xy=True)
    x0, x1 = ax.get_xlim(); y0, y1 = ax.get_ylim(); lo0, la0 = to_ll.transform(x0, y0); lo1, la1 = to_ll.transform(x1, y1)
    lons = np.arange(np.ceil(lo0 / step) * step, lo1, step); lats = np.arange(np.ceil(la0 / step) * step, la1, step)
    ax.set_xticks([to_p.transform(l, (la0 + la1) / 2)[0] for l in lons]); ax.set_xticklabels([f"{l:.1f}°E" for l in lons], fontsize=fs)
    ax.set_yticks([to_p.transform((lo0 + lo1) / 2, l)[1] for l in lats]); ax.set_yticklabels([f"{l:.1f}°N" for l in lats], fontsize=fs)
    ax.tick_params(length=2, direction="in", top=True, right=True); ax.set_xlim(x0, x1); ax.set_ylim(y0, y1)


def xh_read_clip(path, county_local, pad_m=5000.0, proj4=None):
    """Read a vector file in ITS OWN CRS, keep features intersecting the padded county, return in the local TM CRS.
    Filtering in the file's native CRS avoids the empty-result bug when a layer is stored in EPSG:3857."""
    import geopandas as gpd
    proj4 = proj4 or LOCAL_PROJ4
    g = gpd.read_file(path)
    if g.crs is None:
        raise ValueError(f"{path}: no CRS; set it explicitly before clipping")
    area = gpd.GeoSeries([county_local.buffer(pad_m)], crs=proj4).to_crs(g.crs).iloc[0]
    g = g[g.intersects(area)].to_crs(proj4)
    g["_valid"] = g.is_valid
    return g


def xh_iou(a, b):
    """Area intersection-over-union of two shapely geometries in a metric CRS."""
    u = a.union(b).area
    return float(a.intersection(b).area / u) if u > 0 else float("nan")


def xh_new_length_km(new_lines, base_lines, buf_m=25.0, within=None):
    """Length (km) of new line features lying more than buf_m from the base layer (optionally clipped to `within`)."""
    g = new_lines.geometry
    if within is not None:
        g = g.intersection(within)
    base = base_lines.geometry.buffer(buf_m).union_all()
    return float(g.difference(base).length.sum() / 1000.0)


def xh_strata(dist_m, cuts=(1000.0, 3000.0), labels=("近线", "中距", "远线")):
    """Access strata from a distance in metres (right-closed bins: <=1 km, 1-3 km, >3 km)."""
    import pandas as pd
    return pd.cut(dist_m, [-1.0, cuts[0], cuts[1], 1e12], labels=list(labels))


def xh_strata_sensitivity(defs, base_key):
    """defs: {name: distance Series}. Returns counts per stratum and share agreeing with defs[base_key]."""
    import pandas as pd
    base = xh_strata(defs[base_key]); rows = []
    for k, d in defs.items():
        s = xh_strata(d); c = s.value_counts()
        rows.append({"definition": k, **{str(l): int(c.get(l, 0)) for l in s.cat.categories}, "agree": float((s == base).mean())})
    return pd.DataFrame(rows)
