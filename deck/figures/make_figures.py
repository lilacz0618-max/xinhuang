"""English-language maps and figures for the Xinhuang conference deck.

Inputs  : deck/data/*.gpkg, *.csv (copied from the v5 package, 04_GIS and 05_变量与日历)
Optional: Copernicus GLO-30 DEM tiles N27 E108/E109 (env XH_DEM_DIR) for hillshade and route profiles.
Outputs : deck/figures/*.png (+ deck/figures/fig_numbers.json with values the deck script reads)

Run from the repo root:  python deck/figures/make_figures.py
"""
import json
import os
import glob

import numpy as np
import pandas as pd
import geopandas as gpd
import matplotlib as mpl
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.patches import Rectangle, Patch
from matplotlib.lines import Line2D
from shapely.geometry import Point, LineString

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = HERE
DEM_DIR = os.environ.get("XH_DEM_DIR", "")

LOCAL = "+proj=tmerc +lat_0=0 +lon_0=109.1 +k=1 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m"

mpl.rcParams.update({
    "font.family": "Carlito", "font.size": 9, "axes.linewidth": 0.6,
    "savefig.dpi": 240, "figure.dpi": 100, "axes.edgecolor": "#6b7280",
    "xtick.color": "#4b5563", "ytick.color": "#4b5563", "text.color": "#1f2937",
})

INK, INK2, MUTED = "#1f2937", "#4b5563", "#8b95a1"
# categorical slots 1-7 of the validated reference palette (routes are also direct-labelled)
ROUTE_COL = {"R1": "#2a78d6", "R2": "#eb6834", "R3": "#1baf7a", "R4": "#eda100",
             "R5": "#e87ba4", "R6": "#008300", "R7": "#4a3aa7"}
ROUTE_EN = {"R1": "Fuluo", "R2": "Gongxi", "R3": "Butoujiang", "R4": "Mibei",
            "R5": "Liangsan", "R6": "Yanjia", "R7": "Xindianping"}
ROUTE_RUNS = {"R1": 13, "R2": 10, "R3": 6, "R4": 12, "R5": 10, "R6": 2, "R7": 15}
TOWN_EN = {"晃州镇": "Huangzhou", "波洲镇": "Bozhou", "鱼市镇": "Yushi", "凉伞镇": "Liangsan",
           "扶罗镇": "Fuluo", "中寨镇": "Zhongzhai", "禾滩镇": "Hetan", "贡溪镇": "Gongxi",
           "林冲镇": "Linchong", "步头降苗族乡": "Butoujiang", "米贝苗族乡": "Mibei",
           "天雷林场": "Tianlei Forest Farm"}
MARKET_EN = {"扶罗镇": "Fuluo", "波洲镇": "Bozhou", "中寨镇": "Zhongzhai", "晏家": "Yanjia",
             "田坪": "Tianping", "贡溪镇": "Gongxi", "凉伞镇": "Liangsan", "禾滩镇": "Hetan",
             "米贝乡": "Mibei", "鱼市镇": "Yushi", "天堂": "Tiantang", "晃州镇": "Huangzhou",
             "步头降乡": "Butoujiang", "新寨": "Xinzhai", "李树": "Lishu", "林冲镇": "Linchong",
             "洞坪": "Dongping"}
NEIGH_EN = {"芷江县": "Zhijiang", "玉屏侗族自治县": "Yuping", "万山区": "Wanshan",
            "天柱县": "Tianzhu", "岑巩县": "Cengong", "三穗县": "Sansui", "镇远县": "Zhenyuan",
            "麻阳苗族自治县": "Mayang"}
HALO = [pe.withStroke(linewidth=2.2, foreground="white")]
HALO_S = [pe.withStroke(linewidth=1.6, foreground="white")]

NUM = {}


def rid(s):
    return s.split()[0]


# ------------------------------------------------------------------ data
B = os.path.join(DATA, "xinhuang_base.gpkg")
county = gpd.read_file(B, layer="county")
county_geom = county.geometry.iloc[0]
roads = gpd.read_file(B, layer="roads")
expw = gpd.read_file(B, layer="expressways")
rail = gpd.read_file(B, layer="railways")
water = gpd.read_file(B, layer="water")
admin = gpd.read_file(B, layer="admin_osm")
places = gpd.read_file(B, layer="places")
routes = gpd.read_file(B, layer="routes")
routes["rid"] = routes.route.map(rid)
markets = gpd.read_file(B, layer="markets")
fac = gpd.read_file(B, layer="facilities")
vil = gpd.read_file(os.path.join(DATA, "xinhuang_villages_v5.gpkg"))
frame = pd.read_csv(os.path.join(DATA, "village_frame_v5.csv"))
# v5: township boundaries are dissolved from the 2024 administrative-village layer
towns = vil.dissolve(by="township").reset_index()

x0, y0, x1, y1 = county.total_bounds
PAD = 5500
EXT = (x0 - PAD, x1 + PAD, y0 - PAD, y1 + PAD)
station_xy = list(routes.geometry.iloc[0].coords)[0]

# ------------------------------------------------------------------ DEM / hillshade
HS = None
DEMG = None
if DEM_DIR and glob.glob(os.path.join(DEM_DIR, "*.tif")):
    import rasterio
    from rasterio.merge import merge
    from rasterio.warp import reproject, Resampling
    from rasterio.transform import from_origin
    srcs = [rasterio.open(f) for f in sorted(glob.glob(os.path.join(DEM_DIR, "*.tif")))]
    mosaic, mtr = merge(srcs)
    res = 60.0
    W = int((EXT[1] - EXT[0]) / res); H = int((EXT[3] - EXT[2]) / res)
    dst = np.zeros((H, W), dtype="float32")
    dtr = from_origin(EXT[0], EXT[3], res, res)
    reproject(mosaic[0], dst, src_transform=mtr, src_crs=srcs[0].crs, dst_transform=dtr,
              dst_crs=LOCAL, resampling=Resampling.bilinear)
    DEMG = (dst, dtr, res)
    dy, dx = np.gradient(dst.astype(float) * 1.6, res)
    slope = np.pi / 2 - np.arctan(np.hypot(dx, dy)); aspect = np.arctan2(-dx, dy)
    az, alt = np.radians(360 - 315 + 90), np.radians(45)
    HS = np.clip(np.sin(alt) * np.sin(slope) + np.cos(alt) * np.cos(slope) * np.cos(az - aspect), 0, 1)


def base(ax, hill=True, roads_on=True, towns_on=True, fade=True, water_on=True):
    ax.set_xlim(EXT[0], EXT[1]); ax.set_ylim(EXT[2], EXT[3]); ax.set_aspect("equal")
    ax.set_facecolor("#f6f7f8")
    if hill and HS is not None:
        ax.imshow(HS, extent=EXT, cmap="Greys_r", vmin=0.0, vmax=1.2, alpha=0.42, zorder=0,
                  interpolation="bilinear")
    if fade:
        outside = gpd.GeoSeries([Point((EXT[0] + EXT[1]) / 2, (EXT[2] + EXT[3]) / 2).buffer(1e6)
                                 .difference(county_geom)], crs=LOCAL)
        outside.plot(ax=ax, color="#f7f8f9", alpha=0.62, lw=0, zorder=1)
    if water_on:
        wl = water[water.geom_type.str.contains("Line")]
        wp = water[water.geom_type.str.contains("Polygon")]
        wl.plot(ax=ax, color="#8fb4d4", lw=0.55, zorder=2)
        if len(wp):
            wp.plot(ax=ax, color="#9cc0dd", lw=0, zorder=2)
    if roads_on:
        roads.plot(ax=ax, color="#b9c0c8", lw=0.35, zorder=3)
        expw.plot(ax=ax, color="#7d8791", lw=0.9, zorder=3)
        rail.plot(ax=ax, color="#565e66", lw=0.7, linestyle=(0, (3, 2)), zorder=3)
    if towns_on:
        towns.boundary.plot(ax=ax, color="#7b8794", lw=0.45, linestyle=(0, (4, 2)), zorder=4)
    county.boundary.plot(ax=ax, color="#1f2328", lw=1.3, zorder=6)
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values():
        s.set_color("#9aa3ad"); s.set_linewidth(0.6)


def furniture(ax, km=10, loc=(0.05, 0.05), north=(0.95, 0.86), fs=7.5):
    xa0, xa1 = ax.get_xlim(); ya0, ya1 = ax.get_ylim()
    X = xa0 + loc[0] * (xa1 - xa0); Y = ya0 + loc[1] * (ya1 - ya0)
    h = (ya1 - ya0) * .009; seg = km * 1000 / 2
    for i in range(2):
        ax.add_patch(Rectangle((X + i * seg, Y), seg, h, fc=INK if i == 0 else "white", ec=INK, lw=.5, zorder=20))
    for i, lab in enumerate([0, km // 2, km]):
        ax.text(X + i * seg, Y + 2.0 * h, str(lab), ha="center", va="bottom", fontsize=fs, zorder=20,
                path_effects=HALO_S)
    ax.text(X + 2 * seg + (xa1 - xa0) * .012, Y + h / 2, "km", va="center", fontsize=fs, zorder=20,
            path_effects=HALO_S)
    nx_, ny_ = xa0 + north[0] * (xa1 - xa0), ya0 + north[1] * (ya1 - ya0); L = (ya1 - ya0) * .055
    ax.annotate("", xy=(nx_, ny_ + L), xytext=(nx_, ny_),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1), zorder=20)
    ax.text(nx_, ny_ + L * 1.12, "N", ha="center", va="bottom", fontsize=fs + 1.5, fontweight="bold", zorder=20)


def graticule(ax, step=0.1, fs=7):
    import pyproj
    to_ll = pyproj.Transformer.from_crs(LOCAL, 4326, always_xy=True)
    to_p = pyproj.Transformer.from_crs(4326, LOCAL, always_xy=True)
    xa0, xa1 = ax.get_xlim(); ya0, ya1 = ax.get_ylim()
    lo0, la0 = to_ll.transform(xa0, ya0); lo1, la1 = to_ll.transform(xa1, ya1)
    lons = np.arange(np.ceil(lo0 / step) * step, lo1, step)
    lats = np.arange(np.ceil(la0 / step) * step, la1, step)
    ax.set_xticks([to_p.transform(l, (la0 + la1) / 2)[0] for l in lons])
    ax.set_xticklabels([f"{l:.1f}°E" for l in lons], fontsize=fs)
    ax.set_yticks([to_p.transform((lo0 + lo1) / 2, l)[1] for l in lats])
    ax.set_yticklabels([f"{l:.1f}°N" for l in lats], fontsize=fs)
    ax.tick_params(length=2, direction="in", top=True, right=True, pad=2)
    ax.set_xlim(xa0, xa1); ax.set_ylim(ya0, ya1)


def draw_routes(ax, lw=2.1, labels=True, alpha=1.0, color=None):
    order = ["R5", "R6", "R7", "R3", "R4", "R2", "R1"]
    for r in order:
        g = routes[routes.rid == r]
        g.plot(ax=ax, color=color or ROUTE_COL[r], lw=lw, zorder=8, alpha=alpha,
               path_effects=[pe.Stroke(linewidth=lw + 1.6, foreground="white"), pe.Normal()])
    if labels:
        off = {"R1": (1800, -600), "R2": (1500, -1400), "R3": (600, -2300), "R4": (-2000, -2600),
               "R5": (1300, -1700), "R6": (500, -2200), "R7": (-2800, 1500)}
        ha = {"R4": "center", "R7": "right"}
        for r in order:
            ln = routes[routes.rid == r].geometry.iloc[0]
            ex, ey = list(ln.coords)[-1]
            ax.plot(ex, ey, "o", ms=4.2, mfc="white", mec=ROUTE_COL[r], mew=1.4, zorder=9)
            dx, dy = off[r]
            ax.text(ex + dx, ey + dy, f"{r} {ROUTE_EN[r]}", fontsize=8.2, color=INK, ha=ha.get(r, "left"),
                    va="center", fontweight="bold", zorder=12, path_effects=HALO)


def town_labels(ax, fs=7.2, skip=(), color=INK2):
    pos = {}
    for _, t in towns.iterrows():
        if t.township in skip:
            continue
        p = t.geometry.representative_point()
        pos[t.township] = p
    nudge = {"晃州镇": (1500, 4200), "天雷林场": (0, 0)}
    for k, p in pos.items():
        if k == "天雷林场":
            continue
        dx, dy = nudge.get(k, (0, 0))
        ax.text(p.x + dx, p.y + dy, TOWN_EN[k], fontsize=fs, color=color, ha="center", va="center",
                style="italic", zorder=11, path_effects=HALO_S)


# ------------------------------------------------------------------ 1. study-area map
def fig_study_area():
    fig = plt.figure(figsize=(7.6, 6.05))
    ax = fig.add_axes([0.075, 0.06, 0.9, 0.9])
    base(ax)
    # neighbouring counties
    for _, p in places[places.name.isin(NEIGH_EN)].iterrows():
        if EXT[0] < p.geometry.x < EXT[1] and EXT[2] < p.geometry.y < EXT[3]:
            ax.text(p.geometry.x, p.geometry.y, NEIGH_EN[p['name']], fontsize=7.5, color="#8b95a1",
                    ha="center", va="center", zorder=5, path_effects=HALO_S)
    town_labels(ax, skip=("扶罗镇", "贡溪镇", "凉伞镇", "米贝苗族乡", "步头降苗族乡"))
    draw_routes(ax)
    # facilities
    sx, sy = station_xy
    ax.plot(sx, sy, "s", ms=7, mfc=INK, mec="white", mew=0.8, zorder=14)
    ax.text(sx + 1300, sy + 2300, "County bus station\n(Huangzhou)", fontsize=7.6, color=INK, ha="left",
            va="bottom", zorder=14, path_effects=HALO, linespacing=0.95)
    hsr = fac[fac.kind == "rail_hsr"].geometry.iloc[0]
    ax.plot(hsr.x, hsr.y, "D", ms=5.5, mfc="white", mec=INK, mew=1.1, zorder=14)
    ax.text(hsr.x - 1100, hsr.y - 200, "Xinhuang West\n(high-speed rail)", fontsize=7.2, color=INK, ha="right",
            va="center", zorder=14, path_effects=HALO_S, linespacing=0.95)
    ind = fac[fac.kind == "industrial"]
    for _, f in ind.iterrows():
        ax.plot(f.geometry.x, f.geometry.y, "^", ms=5.5, mfc="#6b7280", mec="white", mew=0.6, zorder=14)
    fy = ind.iloc[0].geometry
    ax.text(fy.x + 1200, fy.y - 1900, "Yushi industrial park", fontsize=7.0, color=INK2, zorder=14,
            path_effects=HALO_S)
    fd = ind.iloc[1].geometry
    ax.text(fd.x - 1300, fd.y - 2300, "Dalong EDZ\n(Guizhou)", fontsize=7.0, color=INK2, ha="center",
            zorder=14, path_effects=HALO_S, va="top", linespacing=0.95)
    furniture(ax, loc=(0.035, 0.045), north=(0.955, 0.83))
    graticule(ax)
    # legend
    h = [Line2D([], [], color="#1f2328", lw=1.3, label="County boundary"),
         Line2D([], [], color="#7b8794", lw=0.8, ls=(0, (4, 2)), label="Township boundary"),
         Line2D([], [], color="#7d8791", lw=1.0, label="Expressway (G60)"),
         Line2D([], [], color="#565e66", lw=0.8, ls=(0, (3, 2)), label="Railway"),
         Line2D([], [], color="#8fb4d4", lw=1.0, label="River"),
         Line2D([], [], marker="s", ls="", mfc=INK, mec="white", ms=6, label="Bus station"),
         Line2D([], [], marker="D", ls="", mfc="white", mec=INK, ms=5, label="High-speed rail station"),
         Line2D([], [], marker="^", ls="", mfc="#6b7280", mec="white", ms=6, label="Industrial park")]
    lg = ax.legend(handles=h, loc="lower right", fontsize=7, frameon=True, framealpha=0.92,
                   edgecolor="#d1d5db", borderpad=0.6, handlelength=1.8, labelspacing=0.35)
    lg.set_zorder(30)
    # locator inset
    ia = fig.add_axes([0.085, 0.705, 0.235, 0.245])
    prov = admin[admin.admin_level.astype(str) == "4"]
    prov.plot(ax=ia, color="#eef0f2", edgecolor="#6b7280", lw=0.5)
    county.plot(ax=ia, color="#c2410c", lw=0)
    for _, p in prov.iterrows():
        c = p.geometry.representative_point()
        nm = "Hunan" if "湖南" in p["name"] else "Guizhou"
        ia.text(c.x, c.y, nm, fontsize=7, color=INK2, ha="center", va="center")
    b = prov.total_bounds
    ia.set_xlim(b[0], b[2]); ia.set_ylim(b[1], b[3]); ia.set_aspect("equal")
    ia.set_xticks([]); ia.set_yticks([])
    for s in ia.spines.values():
        s.set_color("#9aa3ad"); s.set_linewidth(0.6)
    ia.set_facecolor("white")
    cc = county_geom.centroid
    ia.annotate("Xinhuang", xy=(cc.x, cc.y), xytext=(cc.x + 60000, cc.y - 170000), fontsize=7, color="#c2410c",
                fontweight="bold", arrowprops=dict(arrowstyle="-", color="#c2410c", lw=0.6))
    fig.text(0.075, 0.012, "Sources: OpenStreetMap contributors (ODbL); Copernicus GLO-30 DEM; 2024 Hunan village "
             "boundaries (townships dissolved). Routes routed on the OSM road graph.", fontsize=6.3, color=MUTED)
    fig.savefig(os.path.join(OUT, "map_study_area.png"), facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ 2. population + access strata
STRAT_EN = {"近线≤1km": "Near (≤1 km)", "中距1–3km": "Middle (1–3 km)", "远线>3km": "Far (>3 km)"}
STRAT_COL = {"近线≤1km": "#1c5cab", "中距1–3km": "#6da7ec", "远线>3km": "#dbe7f6"}


def fig_access():
    v = vil
    fig, axs = plt.subplots(1, 2, figsize=(8.6, 4.35))
    fig.subplots_adjust(left=0.01, right=0.99, top=0.9, bottom=0.2, wspace=0.04)
    # a density
    ax = axs[0]
    base(ax, hill=False, roads_on=False, towns_on=False, fade=False, water_on=False)
    ax.set_facecolor("white")
    norm = mpl.colors.LogNorm(vmin=20, vmax=5000)
    cmap = mpl.colors.LinearSegmentedColormap.from_list("b", ["#f1f6fd", "#9ec5f4", "#3987e5", "#1c5cab", "#0d366b"])
    v.plot(ax=ax, column="pop_density", cmap=cmap, norm=norm, edgecolor="white", lw=0.25, zorder=2)
    towns.boundary.plot(ax=ax, color="#4b5563", lw=0.5, zorder=4)
    ax.plot(*station_xy, "*", ms=11, mfc="#c2410c", mec="white", mew=0.7, zorder=10)
    for sp in ax.spines.values():
        sp.set_visible(False)
    ax.set_title("a  Modelled population density (WorldPop 2020)", fontsize=10, loc="left", color=INK, pad=4)
    cax = fig.add_axes([0.1, 0.12, 0.3, 0.03])
    cb = fig.colorbar(mpl.cm.ScalarMappable(norm=norm, cmap=cmap), cax=cax, orientation="horizontal")
    cb.set_ticks([30, 100, 300, 1000, 3000]); cb.set_ticklabels(["30", "100", "300", "1,000", "3,000"])
    cb.ax.tick_params(labelsize=7.5, length=2); cb.outline.set_linewidth(0.4)
    cb.set_label("persons per km² (log scale)", fontsize=8, color=INK2)
    # b strata
    ax = axs[1]
    base(ax, hill=False, roads_on=False, towns_on=False, fade=False, water_on=False)
    ax.set_facecolor("white")
    for k, c in STRAT_COL.items():
        v[v.stratum_access == k].plot(ax=ax, color=c, edgecolor="white", lw=0.25, zorder=2)
    towns.boundary.plot(ax=ax, color="#4b5563", lw=0.5, zorder=4)
    routes.plot(ax=ax, color=INK, lw=1.2, zorder=6)
    ax.plot(*station_xy, "*", ms=11, mfc="#c2410c", mec="white", mew=0.7, zorder=10)
    cnt = v.stratum_access.value_counts(); popk = v.groupby("stratum_access").pop_wp2020.sum()
    for sp in ax.spines.values():
        sp.set_visible(False)
    ax.set_title("b  Network distance to a recorded route", fontsize=10, loc="left", color=INK, pad=4)
    h = [Patch(fc=STRAT_COL[k], ec="#9aa3ad", lw=0.4,
               label=f"{STRAT_EN[k]}: {cnt[k]} villages, {popk[k]/1000:.0f}k people") for k in STRAT_COL]
    h += [Line2D([], [], color=INK, lw=1.2, label="Recorded bus route"),
          Line2D([], [], marker="*", ls="", mfc="#c2410c", mec="white", ms=10, label="County bus station")]
    fig.legend(handles=h, loc="lower left", bbox_to_anchor=(0.515, 0.0), fontsize=7.6, frameon=False, ncol=1,
               handlelength=1.5, labelspacing=0.3)
    fig.savefig(os.path.join(OUT, "map_access.png"), facecolor="white")
    plt.close(fig)
    NUM["strata"] = {STRAT_EN[k]: [int(cnt[k]), int(popk[k])] for k in STRAT_COL}
    NUM["pop_total"] = int(v.pop_wp2020.sum())


# ------------------------------------------------------------------ 3. household sampling map
EXCL = ["晃州社区", "晃州村", "长滩村", "酒店塘工业园", "农业原种场"]


def fig_sampling(sel_path):
    sel = pd.read_csv(sel_path)
    v = vil
    fig = plt.figure(figsize=(5.2, 4.55))
    ax = fig.add_axes([0.01, 0.13, 0.98, 0.86])
    base(ax, hill=False, roads_on=False, towns_on=False, fade=False, water_on=False)
    ax.set_facecolor("white")
    light = {"近线≤1km": "#9ec5f4", "中距1–3km": "#cde2fb", "远线>3km": "#f1f5fa"}
    for k, c in light.items():
        v[v.stratum_access == k].plot(ax=ax, color=c, edgecolor="white", lw=0.3, zorder=2)
    for sp in ax.spines.values():
        sp.set_visible(False)
    ex = v[v.village.isin(EXCL)]
    ex.plot(ax=ax, facecolor="#e5e7eb", edgecolor="#6b7280", hatch="////", lw=0.3, zorder=3)
    towns.boundary.plot(ax=ax, color="#6b7280", lw=0.45, zorder=4)
    routes.plot(ax=ax, color="#c2410c", lw=1.1, zorder=6)
    vv = pd.DataFrame({"code": vil.code.astype(str), "rx": vil.rx, "ry": vil.ry})
    sel["行政村代码"] = sel["行政村代码"].astype(str)
    s = sel.merge(vv, left_on="行政村代码", right_on="code")
    assert len(s) == len(sel), (len(s), len(sel))
    main = s[s["用途"] == "正式"]; res = s[s["用途"] == "备用"]
    ax.scatter(main.rx, main.ry, s=24, c=INK, edgecolors="white", linewidths=0.6, zorder=9)
    ax.scatter(res.rx, res.ry, s=24, facecolors="white", edgecolors=INK, linewidths=0.9, zorder=9)
    furniture(ax, km=10, loc=(0.04, 0.05), north=(0.94, 0.84), fs=7)
    h = [Patch(fc=light[k], ec="#9aa3ad", lw=0.4, label=STRAT_EN[k]) for k in light]
    h += [Patch(fc="#e5e7eb", ec="#6b7280", hatch="////", lw=0.4, label="Urban / industrial (excluded)"),
          Line2D([], [], color="#c2410c", lw=1.2, label="Bus route"),
          Line2D([], [], marker="o", ls="", mfc=INK, mec="white", ms=6, label="Selected village (30)"),
          Line2D([], [], marker="o", ls="", mfc="white", mec=INK, ms=6, label="Reserve village (6)")]
    fig.legend(handles=h, loc="lower center", ncol=3, fontsize=7.0, frameon=False, handlelength=1.4,
               columnspacing=1.0, labelspacing=0.3, bbox_to_anchor=(0.5, 0.0))
    fig.savefig(os.path.join(OUT, "map_sampling.png"), facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ 4. periodic markets
CYC_COL = {"1/6": "#2a78d6", "2/7": "#eb6834", "3/8": "#1baf7a", "4/9": "#eda100", "5/0": "#4a3aa7"}


def fig_markets():
    fig = plt.figure(figsize=(5.6, 4.6))
    ax = fig.add_axes([0.01, 0.01, 0.98, 0.98])
    base(ax, hill=True, roads_on=False, towns_on=True)
    routes.plot(ax=ax, color="#4b5563", lw=1.2, zorder=7,
                path_effects=[pe.Stroke(linewidth=2.6, foreground="white"), pe.Normal()])
    nudge = {"晃州镇": (0, 2300), "禾滩镇": (2600, 0), "李树": (2300, 0), "米贝乡": (0, -2300),
             "田坪": (0, -2300), "洞坪": (0, 2300), "鱼市镇": (0, -2300), "林冲镇": (0, -2300)}
    for _, m in markets.iterrows():
        c = CYC_COL[m.cycle]
        ax.plot(m.geometry.x, m.geometry.y, "o", ms=8.5, mfc=c, mec="white", mew=1.0, zorder=10)
        dx, dy = nudge.get(m.market, (0, 2300))
        ax.text(m.geometry.x + dx, m.geometry.y + dy, MARKET_EN[m.market], fontsize=7.4, ha="center",
                va="center", color=INK, zorder=11, path_effects=HALO)
    h = [Line2D([], [], marker="o", ls="", mfc=c, mec="white", ms=8,
                label=f"Lunar days ending {k.replace('/', ' or ')}") for k, c in CYC_COL.items()]
    h += [Line2D([], [], color="#4b5563", lw=1.2, label="Bus route")]
    ax.legend(handles=h, loc="lower right", fontsize=7.2, frameon=True, framealpha=0.92, edgecolor="#d1d5db",
              title="Market cycle", title_fontsize=7.6, labelspacing=0.35)
    furniture(ax, km=10, loc=(0.04, 0.05), north=(0.94, 0.84), fs=7)
    fig.savefig(os.path.join(OUT, "map_markets.png"), facecolor="white")
    plt.close(fig)
    # route x lunar-day digit: markets within 2 km of each route that meet on that digit
    tab = {}
    for _, r in routes.iterrows():
        buf = r.geometry.buffer(2000)
        near = markets[markets.within(buf)]
        row = []
        for d in [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]:
            row.append(int(sum(str(d) in m.cycle.split("/") for _, m in near.iterrows())))
        tab[r.rid] = row
    NUM["market_by_digit"] = tab


# ------------------------------------------------------------------ 5. segment supply
def fig_supply():
    step = 60.0
    pts = []
    for _, r in routes.iterrows():
        ln = r.geometry
        n = int(ln.length // step)
        for i in range(n + 1):
            p = ln.interpolate(i * step)
            pts.append((r.rid, i, p))
    lines = {r.rid: r.geometry for _, r in routes.iterrows()}
    buf = {k: g.buffer(45) for k, g in lines.items()}
    rec = []
    for rr, i, p in pts:
        sup = sum(ROUTE_RUNS[k] for k in lines if buf[k].contains(p))
        rec.append((rr, i, p, sup))
    df = pd.DataFrame(rec, columns=["rid", "i", "p", "sup"])
    classes = [(2, 5, "#fde6c8", 1.3), (6, 10, "#f6b26b", 1.8), (12, 15, "#e0762c", 2.3),
               (16, 30, "#b4441c", 3.0), (31, 60, "#6e1f0c", 4.0)]
    fig = plt.figure(figsize=(5.6, 4.6))
    ax = fig.add_axes([0.01, 0.01, 0.98, 0.98])
    base(ax, hill=True, roads_on=False, towns_on=True)
    for lo, hi, col, lw in classes:
        for rr, g in df.groupby("rid"):
            g = g.sort_values("i")
            seg = []
            for _, row in g.iterrows():
                if lo <= row.sup <= hi:
                    seg.append((row.p.x, row.p.y))
                else:
                    if len(seg) > 1:
                        ax.plot(*zip(*seg), color=col, lw=lw, solid_capstyle="round", zorder=7 + lo / 100)
                    seg = []
            if len(seg) > 1:
                ax.plot(*zip(*seg), color=col, lw=lw, solid_capstyle="round", zorder=7 + lo / 100)
    ax.plot(*station_xy, "s", ms=6.5, mfc=INK, mec="white", mew=0.8, zorder=14)
    town_labels(ax, fs=6.8)
    h = [Line2D([], [], color=c, lw=lw, label=(f"{lo}–{hi}" if hi < 60 else f"{lo}+") + " runs/day")
         for lo, hi, c, lw in classes]
    ax.legend(handles=h, loc="lower right", fontsize=7.2, frameon=True, framealpha=0.92, edgecolor="#d1d5db",
              title="Scheduled one-way runs per segment", title_fontsize=7.4, labelspacing=0.35)
    furniture(ax, km=10, loc=(0.04, 0.05), north=(0.94, 0.84), fs=7)
    fig.savefig(os.path.join(OUT, "map_supply.png"), facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ 6. route elevation profiles
def fig_profiles():
    if DEMG is None:
        return
    dem, tr, res = DEMG
    inv = ~tr
    fig, axs = plt.subplots(7, 1, figsize=(5.0, 4.9), sharex=True)
    fig.subplots_adjust(left=0.1, right=0.985, top=0.985, bottom=0.1, hspace=0.12)
    stats = {}
    for ax, r in zip(axs, ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]):
        ln = routes[routes.rid == r].geometry.iloc[0]
        d = np.arange(0, ln.length, 200.0)
        z = []
        for s in d:
            p = ln.interpolate(s)
            c, rr = inv * (p.x, p.y)
            z.append(dem[int(rr), int(c)])
        z = np.convolve(np.array(z), np.ones(3) / 3, mode="same")
        z[0] = z[1]; z[-1] = z[-2]
        climb = float(np.clip(np.diff(z), 0, None).sum())
        stats[r] = {"km": round(ln.length / 1000, 1), "climb_m": int(round(climb, -1)),
                    "max_m": int(z.max()), "min_m": int(z.min())}
        ax.fill_between(d / 1000, 200, z, color=ROUTE_COL[r], alpha=0.22, lw=0)
        ax.plot(d / 1000, z, color=ROUTE_COL[r], lw=1.3)
        ax.set_ylim(200, 900); ax.set_yticks([300, 600, 900])
        ax.tick_params(labelsize=6.5, length=2)
        for sp in ["top", "right"]:
            ax.spines[sp].set_visible(False)
        ax.grid(axis="y", color="#e5e7eb", lw=0.5); ax.set_axisbelow(True)
        ax.text(0.995, 0.93, f"{r} {ROUTE_EN[r]} · {stats[r]['km']} km",
                transform=ax.transAxes, ha="right", va="top", fontsize=7.2, color=INK)
    axs[-1].set_xlabel("Distance from county bus station (km)", fontsize=8)
    axs[3].set_ylabel("Elevation (m)", fontsize=8)
    axs[-1].set_xlim(0, 63)
    fig.savefig(os.path.join(OUT, "fig_profiles.png"), facecolor="white")
    plt.close(fig)
    NUM["profiles"] = stats


# ------------------------------------------------------------------ 7. calendar timeline
def fig_calendar():
    c = pd.read_csv(os.path.join(DATA, "calendar_daily_v5.csv"), parse_dates=["date"])
    COL = {"A": "#3b6e9a", "V": "#1c7c4a", "P": "#e8a33d", "U": "#c4c9cf"}
    rows = [("Statutory holiday blocks", lambda d: d.holiday.notna(), lambda d: np.where(d.src_holiday == "U", "U", "A")),
            ("Spring Festival travel (chunyun)", lambda d: d.chunyun, lambda d: np.full(len(d), "A")),
            ("School term: compulsory", lambda d: d.term_compulsory.fillna(True) & ~d.term_compulsory.isna() | d.term_compulsory.isna(),
             lambda d: np.where(d.term_compulsory.isna(), "U", d.src_term)),
            ("School term: senior high", lambda d: d.term_highschool.fillna(True) & ~d.term_highschool.isna() | d.term_highschool.isna(),
             lambda d: np.where(d.term_highschool.isna(), "U", d.src_term)),
            ("Sunday: students back to town", lambda d: d.weekly_outbound_day & (d.term_compulsory == True),
             lambda d: d.src_term),
            ("Fri/Sat: students home", lambda d: d.last_school_day_of_week == True, lambda d: d.src_term),
            ("Gaokao (college entrance exam)", lambda d: d.gaokao, lambda d: np.full(len(d), "A"))]
    fig, ax = plt.subplots(figsize=(11.6, 3.45))
    fig.subplots_adjust(left=0.2, right=0.99, top=0.97, bottom=0.2)
    dnum = mpl.dates.date2num(c.date)
    for i, (lab, mask, src) in enumerate(rows):
        m = np.asarray(mask(c)).astype(bool)
        s = np.asarray(src(c))
        y = len(rows) - 1 - i
        for dn, ok, ss in zip(dnum, m, s):
            if ok:
                if ss == "U":
                    ax.add_patch(Rectangle((dn, y - 0.36), 1, 0.72, fc="white", ec="#9aa3ad", hatch="////", lw=0.0))
                else:
                    ax.add_patch(Rectangle((dn, y - 0.36), 1, 0.72, fc=COL[ss], lw=0))
        ax.text(-0.01, y, lab, transform=ax.get_yaxis_transform(), ha="right", va="center", fontsize=9, color=INK)
    ax.set_ylim(-0.7, len(rows) - 0.3)
    ax.set_xlim(dnum.min(), dnum.max() + 1)
    ax.set_yticks([])
    ax.xaxis.set_major_locator(mpl.dates.MonthLocator(bymonth=[1, 4, 7, 10]))
    ax.xaxis.set_major_formatter(mpl.dates.DateFormatter("%b %Y"))
    ax.tick_params(axis="x", labelsize=8.5, length=2)
    for sp in ["top", "right", "left"]:
        ax.spines[sp].set_visible(False)
    h = [Patch(fc=COL["A"], label="Algorithm / regulation (reliable)"),
         Patch(fc=COL["V"], label="Official notice verified"),
         Patch(fc=COL["P"], label="Presumed — to verify with county education bureau"),
         Patch(fc="white", ec="#9aa3ad", hatch="////", label="Not yet published (2027)")]
    fig.legend(handles=h, loc="lower center", ncol=4, fontsize=8.5, frameon=False, bbox_to_anchor=(0.595, 0.0),
               handlelength=1.4, columnspacing=1.6)
    fig.savefig(os.path.join(OUT, "fig_calendar.png"), facecolor="white")
    plt.close(fig)


# ------------------------------------------------------------------ 8. clean title-slide map
def fig_title_map():
    fig = plt.figure(figsize=(6.2, 5.0))
    fig.patch.set_alpha(0)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(x0 - 1500, x1 + 1500); ax.set_ylim(y0 - 1500, y1 + 1500); ax.set_aspect("equal")
    ax.axis("off"); ax.patch.set_alpha(0)
    if HS is not None:
        im = ax.imshow(HS, extent=EXT, cmap="Greys_r", vmin=-0.15, vmax=1.3, alpha=0.38, zorder=0,
                       interpolation="bilinear")
        from matplotlib.patches import PathPatch
        from matplotlib.path import Path
        verts, codes = [], []
        polys = county_geom.geoms if county_geom.geom_type == "MultiPolygon" else [county_geom]
        for pg in polys:
            xs, ys = pg.exterior.xy
            verts += list(zip(xs, ys)); codes += [Path.MOVETO] + [Path.LINETO] * (len(xs) - 2) + [Path.CLOSEPOLY]
        pp = PathPatch(Path(verts, codes), transform=ax.transData, fc="none", ec="none")
        ax.add_patch(pp); im.set_clip_path(pp)
    towns.boundary.plot(ax=ax, color="#9aa3ad", lw=0.4, linestyle=(0, (4, 2)), zorder=4)
    county.boundary.plot(ax=ax, color="#1f2328", lw=1.1, zorder=6)
    draw_routes(ax, lw=2.0, labels=False)
    ax.plot(*station_xy, "s", ms=6.5, mfc=INK, mec="white", mew=0.8, zorder=14)
    fig.savefig(os.path.join(OUT, "map_title.png"), transparent=True)
    plt.close(fig)


if __name__ == "__main__":
    import sys
    sel = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DATA, "household_sample_v5.csv")
    fig_study_area(); print("study area")
    fig_access(); print("access")
    if os.path.exists(sel):
        fig_sampling(sel); print("sampling")
    fig_markets(); print("markets")
    fig_supply(); print("supply")
    fig_profiles(); print("profiles")
    fig_calendar(); print("calendar")
    fig_title_map(); print("title map")
    with open(os.path.join(OUT, "fig_numbers.json"), "w") as f:
        json.dump(NUM, f, ensure_ascii=False, indent=1)
    print(json.dumps(NUM, ensure_ascii=False)[:1500])
