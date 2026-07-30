/* tslint:disable */
/* eslint-disable */

export function height_plan_json(diagonal_inches: number, eye_height_cm: number, viewing_distance_cm: number, viewing_angle_deg: number, furniture_height_cm: number, requested_clearance_cm: number): string;

export function match_mounts_json(tv_weight_kg: number, diagonal_inches: number, vesa_width_mm: number, vesa_height_mm: number, requested_mechanism: string, mounts_json: string): string;

export function mounting_map_json(diagonal_inches: number, eye_height_cm: number, viewing_distance_cm: number, viewing_angle_deg: number, furniture_height_cm: number, requested_clearance_cm: number, vesa_vertical_offset_cm: number, wall_plate_offset_cm: number): string;

export function tilt_angle_plan_json(diagonal_inches: number, screen_center_height_cm: number, eye_height_cm: number, viewing_distance_cm: number, maximum_down_tilt_degrees: number, maximum_up_tilt_degrees: number): string;

export function turn_clearance_plan_json(tv_width_cm: number, vesa_offset_cm: number, target_angle_degrees: number, available_extension_cm: number, safety_clearance_cm: number): string;

export function tv_zone_socket_plan_json(diagonal_inches: number, screen_center_height_cm: number, plate_width_cm: number, plate_height_cm: number, plate_horizontal_offset_cm: number, plate_vertical_offset_cm: number, socket_width_cm: number, socket_height_cm: number, socket_horizontal_offset_cm: number, socket_vertical_offset_cm: number, service_margin_cm: number, required_depth_cm: number, wall_clearance_cm: number, powered_devices: number, spare_power_modules: number, ethernet_modules: number, antenna_modules: number): string;

export function viewing_geometry_json(mode: string, value: number, horizontal_angle_deg: number): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly height_plan_json: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly match_mounts_json: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly mounting_map_json: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly tilt_angle_plan_json: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly turn_clearance_plan_json: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly tv_zone_socket_plan_json: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number) => void;
    readonly viewing_geometry_json: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
