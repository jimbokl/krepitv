export function compareSlimMountClearance(mounts, plugDepthMm, reserveMm) {
  if (String(plugDepthMm).trim() === "" || String(reserveMm).trim() === "") {
    return { error: "Укажите выступ штекера и запас в миллиметрах." };
  }
  const depth = Number(plugDepthMm);
  const reserve = Number(reserveMm);
  if (!Number.isFinite(depth) || !Number.isFinite(reserve)
    || depth < 0 || reserve < 0 || depth > 200 || reserve > 100) {
    return { error: "Укажите выступ от 0 до 200 мм и запас от 0 до 100 мм." };
  }
  const requiredMm = depth + reserve;
  return {
    requiredMm,
    rows: mounts
      .filter((mount) => Number.isFinite(mount.wall_distance_min_mm))
      .map((mount) => ({
        mount,
        status: mount.wall_distance_min_mm < requiredMm ? "too-tight" : "check-on-site",
      }))
      .sort((left, right) => left.mount.wall_distance_min_mm - right.mount.wall_distance_min_mm),
  };
}
